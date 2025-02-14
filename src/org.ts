import Cookies from "js-cookie"
import { ACTIVE_ORG_ID_COOKIE_NAME } from "./cookies"

export type OrgMemberInfo = {
    orgId: string
    orgName: string
    orgMetadata: { [key: string]: any }
    urlSafeOrgName: string
    orgRoleStructure: OrgRoleStructure
    userAssignedRole: string
    userInheritedRolesPlusCurrentRole: string[]
    userPermissions: string[]
    userAssignedAdditionalRoles: string[]
    legacyOrgId: string
}
export type OrgIdToOrgMemberInfo = {
    [orgId: string]: OrgMemberInfo
}

export enum OrgRoleStructure {
    SingleRole = "single_role_in_hierarchy",
    MultiRole = "multi_role",
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
