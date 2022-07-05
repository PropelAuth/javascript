import {OrgIdToOrgMemberInfo, OrgMemberInfo} from "./org";

export type OrgHelper = {
    getOrgs: () => OrgMemberInfo[]
    getOrgIds: () => string[]
    getOrg: (orgId: string) => OrgMemberInfo | undefined
    getOrgByName: (orgName: string) => OrgMemberInfo | undefined
}

export function getOrgHelper(
    orgIdToOrgMemberInfo: OrgIdToOrgMemberInfo,
): OrgHelper {
    return {
        getOrg(orgId: string): OrgMemberInfo | undefined {
            if (orgIdToOrgMemberInfo.hasOwnProperty(orgId)) {
                return orgIdToOrgMemberInfo[orgId]
            } else {
                return undefined
            }
        },
        getOrgIds(): string[] {
            return Object.keys(orgIdToOrgMemberInfo)
        },
        getOrgs(): OrgMemberInfo[] {
            return Object.values(orgIdToOrgMemberInfo)
        },
        getOrgByName(orgName: string): OrgMemberInfo | undefined {
            for (const orgMemberInfo of Object.values(orgIdToOrgMemberInfo)) {
                if (orgMemberInfo.orgName === orgName || orgMemberInfo.urlSafeOrgName === orgName) {
                    return orgMemberInfo
                }
            }
            return undefined
        },
    }
}