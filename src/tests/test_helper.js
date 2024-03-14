/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid"

export function createOrgIdToOrgMemberInfo(orgs) {
    let orgIdToOrgMemberInfo = {}
    for (let org of orgs) {
        orgIdToOrgMemberInfo[org.orgId] = org
    }
    return orgIdToOrgMemberInfo
}

export function createOrgs(numOrgs) {
    let orgs = []
    for (let i = 0; i < numOrgs; i++) {
        orgs.push(createOrg())
    }
    return orgs
}

export function createOrg() {
    const orgName = randomString()
    const urlSafeOrgName = orgName.toLowerCase()
    return {
        orgId: uuidv4(),
        orgName,
        orgMetadata: {
            hello: "world",
        },
        urlSafeOrgName,
        userAssignedRole: "Admin",
        userInheritedRolesPlusCurrentRole: ["Admin", "Member"],
        userPermissions: ["read", "write"],
    }
}

function randomString() {
    return (Math.random() + 1).toString(36).substring(3)
}

// https://stackoverflow.com/questions/8024149/is-it-possible-to-get-the-non-enumerable-inherited-property-names-of-an-object
export function getAllProperties(obj) {
    let allProps = [],
        curr = obj
    do {
        const props = Object.getOwnPropertyNames(curr)
        props.forEach(function (prop) {
            if (allProps.indexOf(prop) === -1) {
                allProps.push(prop)
            }
        })
    } while ((curr = Object.getPrototypeOf(curr)))
    return allProps
}
