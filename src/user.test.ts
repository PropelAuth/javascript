import { OrgRoleStructure } from "./org"
import { UserClass, OrgMemberInfoClass } from "./user"

const mockUserOrgInfo = new OrgMemberInfoClass(
    "mockOrgId",
    "Mock Org Name",
    {},
    "mock-org-name",
    "Admin",
    ["Admin", "Member"],
    ["user::create", "user::delete"]
)

const mockUser = new UserClass(
    {
        userId: "userId",
        email: "email",
        createdAt: 12345678,
        firstName: "firstName",
        lastName: "lastName",
        username: "username",
        legacyUserId: "legacyUserId",
        impersonatorUserId: "impersonatorUserId",
        properties: {
            property: "value",
        },
    },
    {
        mockOrgId: mockUserOrgInfo,
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
        it("should parse a org member info from JSON string", () => {
            expect(OrgMemberInfoClass.fromJSON(JSON.stringify(mockUserOrgInfo))).toEqual(mockUserOrgInfo)
            expect(() => OrgMemberInfoClass.fromJSON("invalid json")).toThrowError()
        })
    })
})

const mockUserOrgInfoMultiRole = new OrgMemberInfoClass(
    "mockOrgId",
    "Mock Org Name",
    {},
    "mock-org-name",
    "Role A",
    ["Role A"],
    ["user::create", "user::delete"],
    OrgRoleStructure.MultiRole,
    ["Role B", "Role C"],
)

const mockUserMultiRole = new UserClass(
    {
        userId: "userId",
        email: "email",
        createdAt: 12345678,
        firstName: "firstName",
        lastName: "lastName",
        username: "username",
        legacyUserId: "legacyUserId",
        impersonatorUserId: "impersonatorUserId",
        properties: {
            property: "value",
        },
    },
    {
        mockOrgId: mockUserOrgInfoMultiRole,
    }
)

describe("User multi-role", () => {
    describe("User Class multi-role", () => {
        it("should get an org", () => {
            expect(mockUserMultiRole.getOrg("mockOrgId")).toEqual(mockUserOrgInfoMultiRole)
            expect(mockUserMultiRole.getOrg("mockOrgId2")).toBeUndefined()
        })
        it("should get an org by name", () => {
            expect(mockUserMultiRole.getOrgByName("Mock Org Name")).toEqual(mockUserOrgInfoMultiRole)
            expect(mockUserMultiRole.getOrgByName("Mock Org Name 2")).toBeUndefined()
        })
        it("should get a user property", () => {
            expect(mockUserMultiRole.getUserProperty("property")).toEqual("value")
            expect(mockUserMultiRole.getUserProperty("property2")).toBeUndefined()
        })
        it("should get all orgs", () => {
            expect(mockUserMultiRole.getOrgs()).toEqual([mockUserOrgInfoMultiRole])
        })
        it("should ensure the user is a certain role", () => {
            expect(mockUserMultiRole.isRole("mockOrgId", "Role A")).toEqual(true)
            expect(mockUserMultiRole.isRole("mockOrgId", "Role B")).toEqual(true)
            expect(mockUserMultiRole.isRole("mockOrgId", "Role C")).toEqual(true)
            expect(mockUserMultiRole.isRole("mockOrgId", "Role D")).toEqual(false)
            expect(mockUserMultiRole.isRole("mockOrgId2", "Role A")).toEqual(false)
        })
        it("should ensure the user is at least a certain role", () => {
            expect(mockUserMultiRole.isAtLeastRole("mockOrgId", "Role A")).toEqual(true)
            expect(mockUserMultiRole.isAtLeastRole("mockOrgId", "Role B")).toEqual(true)
            expect(mockUserMultiRole.isAtLeastRole("mockOrgId", "Role C")).toEqual(true)
            expect(mockUserMultiRole.isAtLeastRole("mockOrgId", "Role D")).toEqual(false)
            expect(mockUserMultiRole.isAtLeastRole("mockOrgId2", "Role A")).toEqual(false)
        })
        it("should ensure the user has a permission", () => {
            expect(mockUserMultiRole.hasPermission("mockOrgId", "user::create")).toEqual(true)
            expect(mockUserMultiRole.hasPermission("mockOrgId", "user::delete")).toEqual(true)
            expect(mockUserMultiRole.hasPermission("mockOrgId", "user::update")).toEqual(false)
            expect(mockUserMultiRole.hasPermission("mockOrgId2", "user::create")).toEqual(false)
        })
        it("should ensure the user has all permissions", () => {
            expect(mockUserMultiRole.hasAllPermissions("mockOrgId", ["user::create", "user::delete"])).toEqual(true)
            expect(mockUserMultiRole.hasAllPermissions("mockOrgId", ["user::create", "user::update"])).toEqual(false)
            expect(mockUserMultiRole.hasAllPermissions("mockOrgId2", ["user::create", "user::delete"])).toEqual(false)
        })
        it("should parse a user from JSON string", () => {
            expect(UserClass.fromJSON(JSON.stringify(mockUser))).toEqual(mockUser)
            expect(() => UserClass.fromJSON("invalid json")).toThrowError()
        })
    })
    describe("UserOrgInfo Class multi-role", () => {
        it("should validate a role", () => {
            expect(mockUserOrgInfoMultiRole.isRole("Role A")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.isRole("Role B")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.isRole("Role C")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.isRole("Role D")).toEqual(false)
        })
        it("should validate a role is at least a certain role", () => {
            expect(mockUserOrgInfoMultiRole.isAtLeastRole("Role A")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.isAtLeastRole("Role B")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.isAtLeastRole("Role C")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.isAtLeastRole("Role D")).toEqual(false)
        })
        it("should validate a permission", () => {
            expect(mockUserOrgInfoMultiRole.hasPermission("user::create")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.hasPermission("user::delete")).toEqual(true)
            expect(mockUserOrgInfoMultiRole.hasPermission("user::update")).toEqual(false)
        })
        it("should validate all permissions", () => {
            expect(mockUserOrgInfoMultiRole.hasAllPermissions(["user::create", "user::delete"])).toEqual(true)
            expect(mockUserOrgInfoMultiRole.hasAllPermissions(["user::create", "user::update"])).toEqual(false)
        })
        it("should parse a org member info from JSON string", () => {
            expect(OrgMemberInfoClass.fromJSON(JSON.stringify(mockUserOrgInfoMultiRole))).toEqual(mockUserOrgInfoMultiRole)
            expect(() => OrgMemberInfoClass.fromJSON("invalid json")).toThrowError()
        })
    })
})
