export interface GetStationInfoResponse {
    result: number;
    data: {
        user_nick: string;
        station_name: string;
        profile_image: string;
        lately_broad_date: string;
        favorite_cnt: number;
    };
}