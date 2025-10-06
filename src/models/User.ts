export interface User {
    id: string;
    nickname: string;
    profileImage?: string;
    color?: string;
    userRoleCode?: string; // Added for Chzzk
    verifiedMark?: boolean; // Added for Chzzk
}
