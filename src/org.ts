import { ACTIVE_ORG_ID_COOKIE_NAME } from "@propelauth/backend-js-utilities"
import Cookies from "js-cookie"

export type OrgMemberInfo = {
    orgId: string
    orgName: string
    urlSafeOrgName: string
    userAssignedRole: string
    userInheritedRolesPlusCurrentRole: string[]
    userPermissions: string[]
}
export type OrgIdToOrgMemberInfo = {
    [orgId: string]: OrgMemberInfo
}

export const setActiveOrgId = (orgId: string) => {
    Cookies.set(ACTIVE_ORG_ID_COOKIE_NAME, orgId)
}

export const getActiveOrgId = (): string | undefined => {
    return Cookies.get(ACTIVE_ORG_ID_COOKIE_NAME)
}
