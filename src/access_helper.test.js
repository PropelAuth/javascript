/**
 * @jest-environment jsdom
 */
import { getAccessHelper } from "./access_helper"
import { createOrgs, createOrgIdToOrgMemberInfo } from "./test_helper"
 
it("access helper validate methods work", async () => {
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
