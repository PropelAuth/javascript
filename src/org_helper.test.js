/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid"
import { getOrgHelper } from "./org_helper"
import { createOrgs, createOrgIdToOrgMemberInfo, getAllProperties } from "./test_helper"

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
