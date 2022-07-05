/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid"
import { getOrgHelper } from "./org_helper"

beforeEach(() => {
    const localStorageMock = (function () {
        let store = {}
        return {
            getItem: function (key) {
                return store[key]
            },
            setItem: function (key, value) {
                store[key] = value.toString()
            },
            clear: function () {
                store = {}
            },
            removeItem: function (key) {
                delete store[key]
            },
        }
    })()
    Object.defineProperty(window, "localStorage", { value: localStorageMock })
})

afterEach(() => {
    localStorage.clear()
})

it("getter methods work", async () => {
    const orgs = createOrgs(10)
    const orgIdToOrgMemberInfo = createOrgIdToOrgMemberInfo(orgs)
    const orgHelper = getOrgHelper(orgIdToOrgMemberInfo)

    // Positive cases
    for (let org of orgs) {
        expect(orgHelper.getOrg(org.orgId)).toStrictEqual(org)
        expect(orgHelper.getOrgByName(org.orgName)).toStrictEqual(org)
        expect(orgHelper.getOrgByName(org.urlSafeOrgName)).toStrictEqual(org)
    }
    expect(orgHelper.getOrgs().sort()).toEqual(orgs.sort())
    expect(orgHelper.getOrgIds().sort()).toEqual(orgs.map((org) => org.orgId).sort())

    // Negative cases
    const inheritedProperties = getAllProperties({})
    for (let notOrg of inheritedProperties) {
        expect(orgHelper.getOrg(notOrg)).toBeFalsy()
        expect(orgHelper.getOrgByName(notOrg)).toBeFalsy()
    }
    for (let i = 0; i < 100; i++) {
        expect(orgHelper.getOrg(uuidv4())).toBeFalsy()
        expect(orgHelper.getOrgByName(uuidv4())).toBeFalsy()
    }
})

function createOrgIdToOrgMemberInfo(orgs) {
    let orgIdToOrgMemberInfo = {}
    for (let org of orgs) {
        orgIdToOrgMemberInfo[org.orgId] = org
    }
    return orgIdToOrgMemberInfo
}

function createOrgs(numOrgs) {
    let orgs = []
    for (let i = 0; i < numOrgs; i++) {
        orgs.push(createOrg())
    }
    return orgs
}

function createOrg() {
    const orgName = randomString()
    const urlSafeOrgName = orgName.toLowerCase()
    return {
        orgId: uuidv4(),
        orgName,
        urlSafeOrgName,
        userRole: choose(["Owner", "Admin", "Member"]),
    }
}

function randomString() {
    return (Math.random() + 1).toString(36).substring(3)
}

function choose(choices) {
    const index = Math.floor(Math.random() * choices.length)
    return choices[index]
}

// https://stackoverflow.com/questions/8024149/is-it-possible-to-get-the-non-enumerable-inherited-property-names-of-an-object
function getAllProperties(obj) {
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
