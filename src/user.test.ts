import { OrgMemberInfo, User } from "./user"

const mockOrgMemberInfo = new OrgMemberInfo(
    "mockOrgId",
    "Mock Org Name",
    {},
    "mock-org-name",
    "Admin",
    ["Admin", "Member"],
    ["user::create", "user::delete"]
)

const mockUser = new User(
    "userId",
    "email",
    {
        mockOrgId: mockOrgMemberInfo,
    },
    "firstName",
    "lastName",
    "username",
    "legacyUserId",
    "impersonatorUserId",
    {
        property: "value",
    }
)

describe("User", () => {
    describe("User Class", () => {
        it("should get an org", () => {
            expect(mockUser.getOrg("mockOrgId")).toEqual(mockOrgMemberInfo)
            expect(mockUser.getOrg("mockOrgId2")).toBeUndefined()
        })
        it("should get an org by name", () => {
            expect(mockUser.getOrgByName("Mock Org Name")).toEqual(mockOrgMemberInfo)
            expect(mockUser.getOrgByName("Mock Org Name 2")).toBeUndefined()
        })
        it("should get a user property", () => {
            expect(mockUser.getUserProperty("property")).toEqual("value")
            expect(mockUser.getUserProperty("property2")).toBeUndefined()
        })
        it("should get all orgs", () => {
            expect(mockUser.getOrgs()).toEqual([mockOrgMemberInfo])
        })
        it("should ensure the user is a certain role", () => {
            expect(mockUser.isRole("mockOrgId", "Admin")).toEqual(true)
            expect(mockUser.isRole("mockOrgId", "Member")).toEqual(false)
            expect(mockUser.isRole("mockOrgId", "Owner")).toEqual(false)
            expect(mockUser.isRole("mockOrgId2", "Admin")).toEqual(false)
        })
        it("should ensure the user is at least a certain role", () => {
            expect(mockUser.isAtLeastRole("mockOrgId", "Admin")).toEqual(true)
            expect(mockUser.isAtLeastRole("mockOrgId", "Member")).toEqual(true)
            expect(mockUser.isAtLeastRole("mockOrgId", "Owner")).toEqual(false)
            expect(mockUser.isAtLeastRole("mockOrgId2", "Admin")).toEqual(false)
        })
        it("should ensure the user has a permission", () => {
            expect(mockUser.hasPermission("mockOrgId", "user::create")).toEqual(true)
            expect(mockUser.hasPermission("mockOrgId", "user::delete")).toEqual(true)
            expect(mockUser.hasPermission("mockOrgId", "user::update")).toEqual(false)
            expect(mockUser.hasPermission("mockOrgId2", "user::create")).toEqual(false)
        })
        it("should ensure the user has all permissions", () => {
            expect(mockUser.hasAllPermissions("mockOrgId", ["user::create", "user::delete"])).toEqual(true)
            expect(mockUser.hasAllPermissions("mockOrgId", ["user::create", "user::update"])).toEqual(false)
            expect(mockUser.hasAllPermissions("mockOrgId2", ["user::create", "user::delete"])).toEqual(false)
        })
        it("should parse a user from JSON string", () => {
            expect(User.fromJSON(JSON.stringify(mockUser))).toEqual(mockUser)
            expect(() => User.fromJSON("invalid json")).toThrowError()
        })
    })
    describe("OrgMemberInfo Class", () => {
        it("should validate a role", () => {
            expect(mockOrgMemberInfo.isRole("Admin")).toEqual(true)
            expect(mockOrgMemberInfo.isRole("Member")).toEqual(false)
            expect(mockOrgMemberInfo.isRole("Owner")).toEqual(false)
        })
        it("should validate a role is at least a certain role", () => {
            expect(mockOrgMemberInfo.isAtLeastRole("Admin")).toEqual(true)
            expect(mockOrgMemberInfo.isAtLeastRole("Member")).toEqual(true)
            expect(mockOrgMemberInfo.isAtLeastRole("Owner")).toEqual(false)
        })
        it("should validate a permission", () => {
            expect(mockOrgMemberInfo.hasPermission("user::create")).toEqual(true)
            expect(mockOrgMemberInfo.hasPermission("user::delete")).toEqual(true)
            expect(mockOrgMemberInfo.hasPermission("user::update")).toEqual(false)
        })
        it("should validate all permissions", () => {
            expect(mockOrgMemberInfo.hasAllPermissions(["user::create", "user::delete"])).toEqual(true)
            expect(mockOrgMemberInfo.hasAllPermissions(["user::create", "user::update"])).toEqual(false)
        })
        it("should get an assigned role", () => {
            expect(mockOrgMemberInfo.getAssignedRole()).toEqual("Admin")
        })
        it("should get inherited roles with current role", () => {
            expect(mockOrgMemberInfo.getInheritedRolesPlusCurrentRole()).toEqual(["Admin", "Member"])
        })
        it("should get permissions", () => {
            expect(mockOrgMemberInfo.getPermissions()).toEqual(["user::create", "user::delete"])
        })
        it("should parse a org member info from JSON string", () => {
            expect(OrgMemberInfo.fromJSON(JSON.stringify(mockOrgMemberInfo))).toEqual(mockOrgMemberInfo)
            expect(() => OrgMemberInfo.fromJSON("invalid json")).toThrowError()
        })
    })
})
