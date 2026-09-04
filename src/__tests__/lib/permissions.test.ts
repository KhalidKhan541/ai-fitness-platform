import {
  Permissions,
  Permission,
  ResourceType,
  Action,
  Role,
} from "@/lib/permissions";

describe("Permissions", () => {
  const userRole: Role = {
    id: "role-user",
    name: "user",
    permissions: [
      Permission.READ_OWN_WORKOUT,
      Permission.CREATE_OWN_WORKOUT,
      Permission.UPDATE_OWN_WORKOUT,
      Permission.DELETE_OWN_WORKOUT,
      Permission.READ_OWN_NUTRITION,
      Permission.CREATE_OWN_NUTRITION,
      Permission.READ_OWN_GOALS,
      Permission.CREATE_OWN_GOALS,
      Permission.READ_OWN_PROGRESS,
      Permission.CREATE_OWN_PROGRESS,
      Permission.READ_PUBLIC_WORKOUT,
      Permission.REACT_TO_POST,
      Permission.COMMENT_ON_POST,
      Permission.CREATE_POST,
    ],
  };

  const adminRole: Role = {
    id: "role-admin",
    name: "admin",
    permissions: Object.values(Permission),
  };

  const moderatorRole: Role = {
    id: "role-moderator",
    name: "moderator",
    permissions: [
      ...userRole.permissions,
      Permission.DELETE_ANY_POST,
      Permission.BAN_USER,
      Permission.READ_ALL_USERS,
      Permission.READ_ALL_WORKOUT,
      Permission.READ_ALL_NUTRITION,
    ],
  };

  describe("hasPermission", () => {
    it("should return true for user with permission", () => {
      const result = Permissions.hasPermission(
        userRole,
        Permission.READ_OWN_WORKOUT
      );

      expect(result).toBe(true);
    });

    it("should return false for user without permission", () => {
      const result = Permissions.hasPermission(
        userRole,
        Permission.DELETE_ANY_POST
      );

      expect(result).toBe(false);
    });

    it("should return true for admin with any permission", () => {
      expect(
        Permissions.hasPermission(adminRole, Permission.BAN_USER)
      ).toBe(true);

      expect(
        Permissions.hasPermission(adminRole, Permission.MANAGE_SYSTEM)
      ).toBe(true);
    });

    it("should handle null role", () => {
      const result = Permissions.hasPermission(
        null as any,
        Permission.READ_OWN_WORKOUT
      );

      expect(result).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has at least one permission", () => {
      const result = Permissions.hasAnyPermission(userRole, [
        Permission.READ_OWN_WORKOUT,
        Permission.DELETE_ANY_POST,
      ]);

      expect(result).toBe(true);
    });

    it("should return false if user has none of the permissions", () => {
      const result = Permissions.hasAnyPermission(userRole, [
        Permission.DELETE_ANY_POST,
        Permission.BAN_USER,
        Permission.MANAGE_SYSTEM,
      ]);

      expect(result).toBe(false);
    });

    it("should handle empty permission list", () => {
      const result = Permissions.hasAnyPermission(userRole, []);

      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true if user has all permissions", () => {
      const result = Permissions.hasAllPermissions(userRole, [
        Permission.READ_OWN_WORKOUT,
        Permission.CREATE_OWN_WORKOUT,
      ]);

      expect(result).toBe(true);
    });

    it("should return false if user is missing any permission", () => {
      const result = Permissions.hasAllPermissions(userRole, [
        Permission.READ_OWN_WORKOUT,
        Permission.DELETE_ANY_POST,
      ]);

      expect(result).toBe(false);
    });
  });

  describe("canAccessResource", () => {
    it("should allow owner to access own resource", () => {
      const result = Permissions.canAccessResource(
        userRole,
        ResourceType.WORKOUT,
        Action.READ,
        { ownerId: "user-1", userId: "user-1" }
      );

      expect(result).toBe(true);
    });

    it("should deny non-owner from accessing private resource", () => {
      const result = Permissions.canAccessResource(
        userRole,
        ResourceType.WORKOUT,
        Action.READ,
        { ownerId: "user-1", userId: "user-2", isPublic: false }
      );

      expect(result).toBe(false);
    });

    it("should allow anyone to access public resource", () => {
      const result = Permissions.canAccessResource(
        userRole,
        ResourceType.WORKOUT,
        Action.READ,
        { ownerId: "user-1", userId: "user-2", isPublic: true }
      );

      expect(result).toBe(true);
    });

    it("should allow admin to access any resource", () => {
      const result = Permissions.canAccessResource(
        adminRole,
        ResourceType.WORKOUT,
        Action.READ,
        { ownerId: "user-1", userId: "admin-1" }
      );

      expect(result).toBe(true);
    });

    it("should allow moderator to read any resource", () => {
      const result = Permissions.canAccessResource(
        moderatorRole,
        ResourceType.WORKOUT,
        Action.READ,
        { ownerId: "user-1", userId: "mod-1" }
      );

      expect(result).toBe(true);
    });

    it("should deny non-owner from updating resource", () => {
      const result = Permissions.canAccessResource(
        userRole,
        ResourceType.WORKOUT,
        Action.UPDATE,
        { ownerId: "user-1", userId: "user-2" }
      );

      expect(result).toBe(false);
    });

    it("should allow owner to update own resource", () => {
      const result = Permissions.canAccessResource(
        userRole,
        ResourceType.WORKOUT,
        Action.UPDATE,
        { ownerId: "user-1", userId: "user-1" }
      );

      expect(result).toBe(true);
    });

    it("should allow moderator to delete any post", () => {
      const result = Permissions.canAccessResource(
        moderatorRole,
        ResourceType.POST,
        Action.DELETE,
        { ownerId: "user-1", userId: "mod-1" }
      );

      expect(result).toBe(true);
    });
  });

  describe("getAllowedActions", () => {
    it("should return allowed actions for resource type", () => {
      const actions = Permissions.getAllowedActions(
        userRole,
        ResourceType.WORKOUT,
        { ownerId: "user-1", userId: "user-1" }
      );

      expect(actions).toContain(Action.READ);
      expect(actions).toContain(Action.UPDATE);
      expect(actions).toContain(Action.DELETE);
    });

    it("should limit actions for non-owner", () => {
      const actions = Permissions.getAllowedActions(
        userRole,
        ResourceType.WORKOUT,
        { ownerId: "user-1", userId: "user-2", isPublic: true }
      );

      expect(actions).toContain(Action.READ);
      expect(actions).not.toContain(Action.UPDATE);
      expect(actions).not.toContain(Action.DELETE);
    });

    it("should return all actions for admin", () => {
      const actions = Permissions.getAllowedActions(
        adminRole,
        ResourceType.WORKOUT,
        { ownerId: "user-1", userId: "admin-1" }
      );

      expect(actions.length).toBeGreaterThan(3);
    });
  });

  describe("getRoles", () => {
    it("should return default roles", () => {
      const roles = Permissions.getRoles();

      expect(roles).toHaveLength(3);
      expect(roles.map((r) => r.name)).toContain("user");
      expect(roles.map((r) => r.name)).toContain("admin");
      expect(roles.map((r) => r.name)).toContain("moderator");
    });
  });

  describe("getRoleByName", () => {
    it("should return role by name", () => {
      const role = Permissions.getRoleByName("user");

      expect(role).toBeDefined();
      expect(role.name).toBe("user");
    });

    it("should return null for non-existent role", () => {
      const role = Permissions.getRoleByName("superadmin");

      expect(role).toBeNull();
    });
  });

  describe("isOwner", () => {
    it("should return true when user is owner", () => {
      const result = Permissions.isOwner("user-1", "user-1");

      expect(result).toBe(true);
    });

    it("should return false when user is not owner", () => {
      const result = Permissions.isOwner("user-1", "user-2");

      expect(result).toBe(false);
    });

    it("should handle null userId", () => {
      const result = Permissions.isOwner("user-1", null);

      expect(result).toBe(false);
    });
  });

  describe("canModerate", () => {
    it("should return true for admin", () => {
      const result = Permissions.canModerate(adminRole);

      expect(result).toBe(true);
    });

    it("should return true for moderator", () => {
      const result = Permissions.canModerate(moderatorRole);

      expect(result).toBe(true);
    });

    it("should return false for regular user", () => {
      const result = Permissions.canModerate(userRole);

      expect(result).toBe(false);
    });
  });

  describe("canManageUsers", () => {
    it("should return true for admin", () => {
      expect(Permissions.canManageUsers(adminRole)).toBe(true);
    });

    it("should return false for moderator", () => {
      expect(Permissions.canManageUsers(moderatorRole)).toBe(false);
    });

    it("should return false for user", () => {
      expect(Permissions.canManageUsers(userRole)).toBe(false);
    });
  });

  describe("canViewAnalytics", () => {
    it("should return true for admin", () => {
      expect(Permissions.canViewAnalytics(adminRole)).toBe(true);
    });

    it("should return true for moderator", () => {
      expect(Permissions.canViewAnalytics(moderatorRole)).toBe(true);
    });

    it("should return false for regular user", () => {
      expect(Permissions.canViewAnalytics(userRole)).toBe(false);
    });
  });

  describe("filterByPermission", () => {
    it("should filter roles by permission", () => {
      const roles = [userRole, adminRole, moderatorRole];

      const result = Permissions.filterByPermission(
        roles,
        Permission.BAN_USER
      );

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toContain("admin");
      expect(result.map((r) => r.name)).toContain("moderator");
    });

    it("should return empty array if no matches", () => {
      const roles = [userRole];

      const result = Permissions.filterByPermission(
        roles,
        Permission.MANAGE_SYSTEM
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("getUserPermissionsSummary", () => {
    it("should return permissions summary", () => {
      const summary = Permissions.getUserPermissionsSummary(userRole);

      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("byResource");
      expect(summary.total).toBe(userRole.permissions.length);
    });

    it("should group by resource type", () => {
      const summary = Permissions.getUserPermissionsSummary(userRole);

      expect(summary.byResource).toHaveProperty("WORKOUT");
      expect(summary.byResource).toHaveProperty("NUTRITION");
    });
  });
});
