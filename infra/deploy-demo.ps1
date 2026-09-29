param(
    [Parameter(Mandatory)][ValidateSet('dev', 'prod')][string]$Stage,
    [string]$Profile = 'galashow',
    [string]$Region = 'ap-northeast-2',
    [string]$HostedZoneId = 'Z0263745GATMIS12FEIH',
    [string]$DomainName = 'polychat.galashow.cloud',
    [string]$CodeBucket = 'galashow-251113431583-ap-northeast-2-artifacts',
    [switch]$SkipInfra,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot
$stack = "polychat-demo-$Stage"
$profileArgs = if ($Profile) { @('--profile', $Profile) } else { @() }
$dist = Join-Path $root 'apps/example-react/dist'

if (-not $SkipBuild) {
    Push-Location $root
    try {
        npm run build
        # The relay is served from the same CloudFront origin under /api.
        $env:VITE_API_URL = '/api'
        npm run "build:$Stage" --workspace=polychat-example-react
    } finally {
        Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
        Pop-Location
    }
}
if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw "Demo build not found: $dist" }

if (-not $SkipInfra) {
    # Package the relay from the same tarball consumers install, plus its production dependencies.
    $work = Join-Path ([IO.Path]::GetTempPath()) "polychat-relay-$Stage"
    if (Test-Path $work) { Remove-Item $work -Recurse -Force }
    New-Item -ItemType Directory -Path $work | Out-Null
    Push-Location $work
    try {
        $tarball = (npm pack $root --silent | Select-Object -Last 1).Trim()
        '{"private":true}' | Set-Content package.json
        npm install "./$tarball" --omit=dev --no-audit --no-fund --silent
        Remove-Item $tarball
        "#!/bin/sh`nexec node node_modules/polychat-bridge/dist/server/cli.js`n" | Set-Content run.sh -NoNewline
        python (Join-Path $PSScriptRoot 'zip-relay.py') $work (Join-Path $work '..' "polychat-relay-$Stage.zip")
    } finally { Pop-Location }
    $zip = Join-Path ([IO.Path]::GetTempPath()) "polychat-relay-$Stage.zip"
    $key = "polychat-relay/$((Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()).zip"
    aws s3 cp $zip "s3://$CodeBucket/$key" --region $Region @profileArgs --only-show-errors

    $overrides = @("StageName=$Stage", "HostedZoneId=$HostedZoneId", "DomainName=$DomainName", "RelayCodeBucket=$CodeBucket", "RelayCodeKey=$key")
    $overrides += "CertificateArn=$(aws cloudformation describe-stacks --stack-name galashow-cloud-certificate --region us-east-1 @profileArgs `
        --query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue | [0]' --output text)"
    # Relay credentials come from the ignored .env.local; omitted values keep the stack's previous ones.
    $envFile = Join-Path $root '.env.local'
    $names = @{ CHZZK_CLIENT_ID = 'ChzzkClientId'; CHZZK_CLIENT_SECRET = 'ChzzkClientSecret'; SOOP_CLIENT_ID = 'SoopClientId';
        SOOP_CLIENT_SECRET = 'SoopClientSecret'; YOUTUBE_CLIENT_ID = 'YouTubeClientId' }
    if (Test-Path $envFile) {
        foreach ($line in Get-Content $envFile) {
            if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$' -and $names.ContainsKey($Matches[1]) -and $Matches[2]) {
                $overrides += "$($names[$Matches[1]])=$($Matches[2].Trim('"'))"
            }
        }
    }
    aws cloudformation deploy --stack-name $stack --template-file (Join-Path $PSScriptRoot 'demo-web.json') --region $Region @profileArgs `
        --capabilities CAPABILITY_IAM --parameter-overrides @overrides --no-fail-on-empty-changeset
}

$outputs = aws cloudformation describe-stacks --stack-name $stack --region $Region @profileArgs --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$bucket = ($outputs | Where-Object OutputKey -eq 'DemoBucket').OutputValue
$distributionId = ($outputs | Where-Object OutputKey -eq 'DemoDistributionId').OutputValue

# Hashed assets are immutable; everything else (index.html, callback routes) must revalidate.
aws s3 sync (Join-Path $dist 'assets') "s3://$bucket/assets" --delete --region $Region @profileArgs --only-show-errors --cache-control 'public,max-age=31536000,immutable'
aws s3 sync $dist "s3://$bucket" --delete --exclude 'assets/*' --region $Region @profileArgs --only-show-errors --cache-control 'no-cache'
aws cloudfront create-invalidation --distribution-id $distributionId --paths '/*' @profileArgs --query 'Invalidation.Id' --output text
($outputs | Where-Object OutputKey -eq 'DemoUrl').OutputValue
