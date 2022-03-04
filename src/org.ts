export type OrgMemberInfo = {
    orgId: string
    orgName: string
    userRoleName: string
}
export type OrgIdToOrgMemberInfo = {
    [orgId: string]: OrgMemberInfo
}