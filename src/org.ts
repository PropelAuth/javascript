export type OrgMemberInfo = {
    orgId: string
    orgName: string
    urlSafeOrgName: string
    userRole: UserRole
}
export type OrgIdToOrgMemberInfo = {
    [orgId: string]: OrgMemberInfo
}

export enum UserRole {
    Member = 0,
    Admin = 1,
    Owner = 2,
}
