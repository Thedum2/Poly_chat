param(
    [Parameter(Mandatory)][ValidateSet('dev', 'prod')][string]$Stage,
    [string]$Profile = 'galashow',
    [string]$Region = 'ap-northeast-2',
    [string]$HostedZoneId = 'Z0263745GATMIS12FEIH',
    [switch]$SkipInfra,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot
$stack = "polychat-demo-$Stage"
$profileArgs = if ($Profile) { @('--profile', $Profile) } else { @() }

if (-not $SkipInfra) {
    $certificateArn = aws cloudformation describe-stacks --stack-name galashow-cloud-certificate --region us-east-1 @profileArgs `
        --query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue | [0]' --output text
    aws cloudformation deploy --stack-name $stack --template-file (Join-Path $PSScriptRoot 'demo-web.json') --region $Region @profileArgs `
        --parameter-overrides "StageName=$Stage" "HostedZoneId=$HostedZoneId" "CertificateArn=$certificateArn" --no-fail-on-empty-changeset
}

$outputs = aws cloudformation describe-stacks --stack-name $stack --region $Region @profileArgs --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$bucket = ($outputs | Where-Object OutputKey -eq 'DemoBucket').OutputValue
$distributionId = ($outputs | Where-Object OutputKey -eq 'DemoDistributionId').OutputValue
$dist = Join-Path $root 'apps/example-react/dist'

if (-not $SkipBuild) {
    Push-Location $root
    try {
        npm run build
        npm run "build:$Stage" --workspace=polychat-example-react
    } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw "Demo build not found: $dist" }

# Hashed assets are immutable; everything else (index.html, callback routes) must revalidate.
aws s3 sync (Join-Path $dist 'assets') "s3://$bucket/assets" --delete --region $Region @profileArgs --cache-control 'public,max-age=31536000,immutable'
aws s3 sync $dist "s3://$bucket" --delete --exclude 'assets/*' --region $Region @profileArgs --cache-control 'no-cache'
aws cloudfront create-invalidation --distribution-id $distributionId --paths '/*' @profileArgs --query 'Invalidation.Id' --output text
($outputs | Where-Object OutputKey -eq 'DemoUrl').OutputValue
