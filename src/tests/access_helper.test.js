/**
 * @jest-environment jsdom
 */
import { getAccessHelper } from "../access_helper"
import { createOrgIdToOrgMemberInfo, createOrgs } from "./test_helper"

it("accessHelper validate methods work", async () => {
    const orgs = createOrgs(1)
    const orgId = orgs[0].orgId
    const fakeOrgId = "fakeOrgId"
    const orgIdToOrgMemberInfo = createOrgIdToOrgMemberInfo(orgs)

    const accessHelper = getAccessHelper(orgIdToOrgMemberInfo)

    // org has the role of "Admin"
    expect(accessHelper.isRole(orgId, "")).toBeFalsy()
    expect(accessHelper.isRole(orgId, "Owner")).toBeFalsy()
    expect(accessHelper.isRole(orgId, "Admin")).toBeTruthy()
    expect(accessHelper.isRole(fakeOrgId, "Admin")).toBeFalsy()
    expect(accessHelper.isRole(orgId, "Member")).toBeFalsy()

    // org has the inherited roles of "Admin" and "Member"
    expect(accessHelper.isAtLeastRole(orgId, "")).toBeFalsy()
    expect(accessHelper.isAtLeastRole(orgId, "Owner")).toBeFalsy()
    expect(accessHelper.isAtLeastRole(orgId, "Admin")).toBeTruthy()
    expect(accessHelper.isAtLeastRole(fakeOrgId, "Admin")).toBeFalsy()
    expect(accessHelper.isAtLeastRole(orgId, "Member")).toBeTruthy()

    // org has the permissions "read" and "write"
    expect(accessHelper.hasPermission(orgId, "")).toBeFalsy()
    expect(accessHelper.hasPermission(orgId, "read")).toBeTruthy()
    expect(accessHelper.hasPermission(fakeOrgId, "read")).toBeFalsy()
    expect(accessHelper.hasPermission(orgId, "write")).toBeTruthy()
    expect(accessHelper.hasPermission(orgId, "delete")).toBeFalsy()

    // org has the permissions "read" and "write"
    expect(accessHelper.hasAllPermissions(orgId, [])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(orgId, [""])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["read"])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(fakeOrgId, ["read"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["write"])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(orgId, ["delete"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["read", "write"])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(orgId, ["read", "delete"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["write", "delete"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["read", "write", "delete"])).toBeFalsy()
})

it("accessHelper validate wrapper methods work", async () => {
    const orgs = createOrgs(1)
    const orgId = orgs[0].orgId
    const fakeOrgId = "fakeOrgId"
    const orgIdToOrgMemberInfo = createOrgIdToOrgMemberInfo(orgs)

    const accessHelper = getAccessHelper(orgIdToOrgMemberInfo)
    const accessHelperWrapper = accessHelper.getAccessHelperWithOrgId(orgId)
    const accessHelperWrapperBad = accessHelper.getAccessHelperWithOrgId(fakeOrgId)

    // we do most of the testing in the above test, this is just to make sure the wrapper methods work
    expect(accessHelperWrapper.isRole("Admin")).toBeTruthy()
    expect(accessHelperWrapper.isRole("Member")).toBeFalsy()
    expect(accessHelperWrapper.isAtLeastRole("Owner")).toBeFalsy()
    expect(accessHelperWrapper.isAtLeastRole("Member")).toBeTruthy()
    expect(accessHelperWrapper.hasPermission("read")).toBeTruthy()
    expect(accessHelperWrapper.hasPermission("delete")).toBeFalsy()
    expect(accessHelperWrapper.hasAllPermissions(["read"])).toBeTruthy()
    expect(accessHelperWrapper.hasAllPermissions(["delete"])).toBeFalsy()
    expect(accessHelperWrapper.hasAllPermissions(["read", "write"])).toBeTruthy()
    expect(accessHelperWrapper.hasAllPermissions(["read", "delete"])).toBeFalsy()
    expect(accessHelperWrapper.hasAllPermissions(["read", "write", "delete"])).toBeFalsy()
    expect(accessHelperWrapperBad.isRole("Admin")).toBeFalsy()
})

// Multi role tests
it("accessHelper validate methods work with multi role", async () => {
    const orgs = createOrgs(1, true)
    const orgId = orgs[0].orgId
    const fakeOrgId = "fakeOrgId"
    const orgIdToOrgMemberInfo = createOrgIdToOrgMemberInfo(orgs)

    const accessHelper = getAccessHelper(orgIdToOrgMemberInfo)

    // org has the roles of "Role A", "Role B", and "Role C" in orgId
    expect(accessHelper.isRole(orgId, "")).toBeFalsy()
    expect(accessHelper.isRole(orgId, "Role D")).toBeFalsy()
    expect(accessHelper.isRole(orgId, "Role A")).toBeTruthy()
    expect(accessHelper.isRole(fakeOrgId, "Role A")).toBeFalsy()
    expect(accessHelper.isRole(orgId, "Role B")).toBeTruthy()
    expect(accessHelper.isRole(orgId, "Role C")).toBeTruthy()
    
    // isAtLeastRole should work the same as isRole for multi role
    expect(accessHelper.isAtLeastRole(orgId, "")).toBeFalsy()
    expect(accessHelper.isAtLeastRole(orgId, "Role D")).toBeFalsy()
    expect(accessHelper.isAtLeastRole(orgId, "Role A")).toBeTruthy()
    expect(accessHelper.isAtLeastRole(fakeOrgId, "Role A")).toBeFalsy()
    expect(accessHelper.isAtLeastRole(orgId, "Role B")).toBeTruthy()
    expect(accessHelper.isAtLeastRole(orgId, "Role C")).toBeTruthy()

    // org has the permissions "read" and "write"
    expect(accessHelper.hasPermission(orgId, "")).toBeFalsy()
    expect(accessHelper.hasPermission(orgId, "read")).toBeTruthy()
    expect(accessHelper.hasPermission(fakeOrgId, "read")).toBeFalsy()
    expect(accessHelper.hasPermission(orgId, "write")).toBeTruthy()
    expect(accessHelper.hasPermission(orgId, "delete")).toBeFalsy()

    // org has the permissions "read" and "write"
    expect(accessHelper.hasAllPermissions(orgId, [])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(orgId, [""])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["read"])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(fakeOrgId, ["read"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["write"])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(orgId, ["delete"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["read", "write"])).toBeTruthy()
    expect(accessHelper.hasAllPermissions(orgId, ["read", "delete"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["write", "delete"])).toBeFalsy()
    expect(accessHelper.hasAllPermissions(orgId, ["read", "write", "delete"])).toBeFalsy()
})
