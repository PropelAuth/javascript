import Cookies from "js-cookie"
import { ACTIVE_ORG_ID_COOKIE_NAME } from "./cookies"

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
    Cookies.set(ACTIVE_ORG_ID_COOKIE_NAME, orgId, {
        sameSite: "lax",
        secure: true,
    })
}

export const getActiveOrgId = (): string | undefined => {
    return Cookies.get(ACTIVE_ORG_ID_COOKIE_NAME)
}
