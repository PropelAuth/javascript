import { UserClass, UserOrgInfo } from "./user"

const mockUserOrgInfo = new UserOrgInfo(
    "mockOrgId",
    "Mock Org Name",
    {},
    "mock-org-name",
    "Admin",
    ["Admin", "Member"],
    ["user::create", "user::delete"]
)

const mockUser = new UserClass(
    "userId",
    "email",
    12345678,
    {
        mockOrgId: mockUserOrgInfo,
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
            expect(mockUser.getOrg("mockOrgId")).toEqual(mockUserOrgInfo)
            expect(mockUser.getOrg("mockOrgId2")).toBeUndefined()
        })
        it("should get an org by name", () => {
            expect(mockUser.getOrgByName("Mock Org Name")).toEqual(mockUserOrgInfo)
            expect(mockUser.getOrgByName("Mock Org Name 2")).toBeUndefined()
        })
        it("should get a user property", () => {
            expect(mockUser.getUserProperty("property")).toEqual("value")
            expect(mockUser.getUserProperty("property2")).toBeUndefined()
        })
        it("should get all orgs", () => {
            expect(mockUser.getOrgs()).toEqual([mockUserOrgInfo])
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
            expect(UserClass.fromJSON(JSON.stringify(mockUser))).toEqual(mockUser)
            expect(() => UserClass.fromJSON("invalid json")).toThrowError()
        })
    })
    describe("UserOrgInfo Class", () => {
        it("should validate a role", () => {
            expect(mockUserOrgInfo.isRole("Admin")).toEqual(true)
            expect(mockUserOrgInfo.isRole("Member")).toEqual(false)
            expect(mockUserOrgInfo.isRole("Owner")).toEqual(false)
        })
        it("should validate a role is at least a certain role", () => {
            expect(mockUserOrgInfo.isAtLeastRole("Admin")).toEqual(true)
            expect(mockUserOrgInfo.isAtLeastRole("Member")).toEqual(true)
            expect(mockUserOrgInfo.isAtLeastRole("Owner")).toEqual(false)
        })
        it("should validate a permission", () => {
            expect(mockUserOrgInfo.hasPermission("user::create")).toEqual(true)
            expect(mockUserOrgInfo.hasPermission("user::delete")).toEqual(true)
            expect(mockUserOrgInfo.hasPermission("user::update")).toEqual(false)
        })
        it("should validate all permissions", () => {
            expect(mockUserOrgInfo.hasAllPermissions(["user::create", "user::delete"])).toEqual(true)
            expect(mockUserOrgInfo.hasAllPermissions(["user::create", "user::update"])).toEqual(false)
        })
        it("should get an assigned role", () => {
            expect(mockUserOrgInfo.getAssignedRole()).toEqual("Admin")
        })
        it("should get inherited roles with current role", () => {
            expect(mockUserOrgInfo.getInheritedRolesPlusCurrentRole()).toEqual(["Admin", "Member"])
        })
        it("should get permissions", () => {
            expect(mockUserOrgInfo.getPermissions()).toEqual(["user::create", "user::delete"])
        })
        it("should parse a org member info from JSON string", () => {
            expect(UserOrgInfo.fromJSON(JSON.stringify(mockUserOrgInfo))).toEqual(mockUserOrgInfo)
            expect(() => UserOrgInfo.fromJSON("invalid json")).toThrowError()
        })
    })
})
