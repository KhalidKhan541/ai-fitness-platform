import {
  SocialService,
  PostType,
  ReactionType,
} from "@/lib/social/social-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    reaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    follow: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = jest.mocked(prisma);

describe("SocialService", () => {
  let service: SocialService;

  const mockPost = {
    id: "post-1",
    userId: "user-1",
    type: PostType.WORKOUT_SHARED,
    content: "Just crushed a 5K personal best!",
    workoutId: "workout-1",
    isPublic: true,
    createdAt: new Date("2024-01-15"),
    author: { id: "user-1", name: "Alice", image: null },
    _count: { reactions: 12, comments: 3 },
  };

  beforeEach(() => {
    service = new SocialService();
    jest.clearAllMocks();
  });

  describe("createPost", () => {
    it("should create a new post", async () => {
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.createPost({
        userId: "user-1",
        type: PostType.WORKOUT_SHARED,
        content: "Just crushed a 5K personal best!",
        workoutId: "workout-1",
      });

      expect(result).toEqual(mockPost);
      expect(mockPrisma.post.create).toHaveBeenCalled();
    });

    it("should validate content length", async () => {
      await expect(
        service.createPost({
          userId: "user-1",
          type: PostType.TEXT,
          content: "",
        })
      ).rejects.toThrow("Post content cannot be empty");

      await expect(
        service.createPost({
          userId: "user-1",
          type: PostType.TEXT,
          content: "x".repeat(5001),
        })
      ).rejects.toThrow("Post content exceeds maximum length");
    });

    it("should validate workout ID for workout posts", async () => {
      await expect(
        service.createPost({
          userId: "user-1",
          type: PostType.WORKOUT_SHARED,
          content: "Check out my workout!",
          workoutId: "",
        })
      ).rejects.toThrow("Workout ID required for workout posts");
    });

    it("should create notification for tagged users", async () => {
      mockPrisma.post.create.mockResolvedValue(mockPost);
      mockPrisma.notification.create.mockResolvedValue({
        id: "notif-1",
        userId: "user-2",
      });

      await service.createPost({
        userId: "user-1",
        type: PostType.TEXT,
        content: "Great session with @user-2!",
        mentions: ["user-2"],
      });

      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it("should respect privacy settings", async () => {
      mockPrisma.post.create.mockResolvedValue({
        ...mockPost,
        isPublic: false,
      });

      const result = await service.createPost({
        userId: "user-1",
        type: PostType.TEXT,
        content: "Private post",
        isPublic: false,
      });

      expect(result.isPublic).toBe(false);
    });
  });

  describe("getPostById", () => {
    it("should return post with details", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await service.getPostById("post-1");

      expect(result).toEqual(mockPost);
      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: "post-1" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          _count: { select: { reactions: true, comments: true } },
        },
      });
    });

    it("should return null for non-existent post", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      const result = await service.getPostById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getUserFeed", () => {
    it("should return paginated feed", async () => {
      mockPrisma.post.findMany.mockResolvedValue([mockPost]);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.getUserFeed("user-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should include posts from followed users", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getUserFeed("user-1", { page: 1, limit: 10 });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ userId: "user-1" }),
            ]),
          }),
        })
      );
    });

    it("should filter by post type", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.getUserFeed("user-1", {
        page: 1,
        limit: 10,
        type: PostType.WORKOUT_SHARED,
      });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: PostType.WORKOUT_SHARED,
          }),
        })
      );
    });

    it("should sort by recency", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getUserFeed("user-1", { page: 1, limit: 10 });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("reactToPost", () => {
    it("should add reaction to post", async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      mockPrisma.reaction.create.mockResolvedValue({
        id: "react-1",
        userId: "user-2",
        postId: "post-1",
        type: ReactionType.LIKE,
      });

      const result = await service.reactToPost(
        "post-1",
        "user-2",
        ReactionType.LIKE
      );

      expect(result).toBeDefined();
      expect(mockPrisma.reaction.create).toHaveBeenCalled();
    });

    it("should update existing reaction", async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue({
        id: "react-1",
        type: ReactionType.LIKE,
      });

      mockPrisma.reaction.update.mockResolvedValue({
        id: "react-1",
        type: ReactionType.FIRE,
      });

      const result = await service.reactToPost(
        "post-1",
        "user-2",
        ReactionType.FIRE
      );

      expect(result.type).toBe(ReactionType.FIRE);
    });

    it("should remove reaction if same type", async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue({
        id: "react-1",
        type: ReactionType.LIKE,
      });

      mockPrisma.reaction.delete.mockResolvedValue({
        id: "react-1",
      });

      await service.reactToPost("post-1", "user-2", ReactionType.LIKE);

      expect(mockPrisma.reaction.delete).toHaveBeenCalled();
    });

    it("should create notification for post author", async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      mockPrisma.reaction.create.mockResolvedValue({ id: "react-1" });

      await service.reactToPost("post-1", "user-2", ReactionType.LIKE);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "REACTION",
          }),
        })
      );
    });
  });

  describe("addComment", () => {
    it("should add a comment to post", async () => {
      mockPrisma.comment.create.mockResolvedValue({
        id: "comment-1",
        postId: "post-1",
        userId: "user-2",
        content: "Great work!",
        createdAt: new Date(),
        author: { id: "user-2", name: "Bob", image: null },
      });

      const result = await service.addComment(
        "post-1",
        "user-2",
        "Great work!"
      );

      expect(result.content).toBe("Great work!");
      expect(mockPrisma.comment.create).toHaveBeenCalled();
    });

    it("should validate comment content", async () => {
      await expect(
        service.addComment("post-1", "user-2", "")
      ).rejects.toThrow("Comment cannot be empty");

      await expect(
        service.addComment("post-1", "user-2", "x".repeat(1001))
      ).rejects.toThrow("Comment exceeds maximum length");
    });

    it("should notify post author of new comment", async () => {
      mockPrisma.comment.create.mockResolvedValue({
        id: "comment-1",
        author: { name: "Bob" },
      });

      await service.addComment("post-1", "user-2", "Nice!");

      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it("should get comments for a post", async () => {
      mockPrisma.comment.findMany.mockResolvedValue([
        {
          id: "comment-1",
          content: "Great!",
          author: { id: "user-2", name: "Bob" },
          createdAt: new Date(),
        },
      ]);

      const comments = await service.getComments("post-1", {
        page: 1,
        limit: 20,
      });

      expect(comments).toHaveLength(1);
    });
  });

  describe("deletePost", () => {
    it("should delete own post", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      mockPrisma.post.delete.mockResolvedValue(mockPost);

      await service.deletePost("post-1", "user-1");

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: "post-1" },
      });
    });

    it("should not allow deleting others' posts", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      await expect(
        service.deletePost("post-1", "user-2")
      ).rejects.toThrow("Not authorized to delete this post");
    });
  });

  describe("followUser", () => {
    it("should follow a user", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      mockPrisma.follow.create.mockResolvedValue({
        id: "follow-1",
        followerId: "user-1",
        followingId: "user-2",
      });

      const result = await service.followUser("user-1", "user-2");

      expect(result).toBeDefined();
      expect(mockPrisma.follow.create).toHaveBeenCalled();
    });

    it("should not allow following self", async () => {
      await expect(
        service.followUser("user-1", "user-1")
      ).rejects.toThrow("Cannot follow yourself");
    });

    it("should not allow duplicate follows", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({
        id: "follow-1",
      });

      await expect(
        service.followUser("user-1", "user-2")
      ).rejects.toThrow("Already following this user");
    });

    it("should unfollow a user", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({
        id: "follow-1",
      });

      mockPrisma.follow.delete.mockResolvedValue({
        id: "follow-1",
      });

      await service.unfollowUser("user-1", "user-2");

      expect(mockPrisma.follow.delete).toHaveBeenCalled();
    });
  });

  describe("getFollowers", () => {
    it("should return user's followers", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([
        { follower: { id: "user-2", name: "Bob" }, createdAt: new Date() },
      ]);

      const result = await service.getFollowers("user-1");

      expect(result).toHaveLength(1);
    });

    it("should paginate followers", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([]);

      await service.getFollowers("user-1", { page: 2, limit: 10 });

      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe("getFollowersCount", () => {
    it("should return follower counts", async () => {
      mockPrisma.follow.count
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(75);

      const result = await service.getFollowersCount("user-1");

      expect(result.followers).toBe(150);
      expect(result.following).toBe(75);
    });
  });

  describe("getNotifications", () => {
    it("should return user notifications", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: "notif-1",
          type: "REACTION",
          userId: "user-1",
          read: false,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getNotifications("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].read).toBe(false);
    });

    it("should mark notification as read", async () => {
      mockPrisma.notification.update.mockResolvedValue({
        id: "notif-1",
        read: true,
      });

      await service.markNotificationRead("notif-1");

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        data: { read: true },
      });
    });

    it("should mark all notifications as read", async () => {
      mockPrisma.notification.updateMany = jest.fn().mockResolvedValue({
        count: 5,
      });

      await service.markAllNotificationsRead("user-1");

      expect(mockPrisma.notification.updateMany).toHaveBeenCalled();
    });

    it("should return unread count", async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await service.getUnreadCount("user-1");

      expect(result).toBe(7);
    });
  });

  describe("getTrendingPosts", () => {
    it("should return trending posts", async () => {
      mockPrisma.post.findMany.mockResolvedValue([mockPost]);

      const result = await service.getTrendingPosts({ limit: 10 });

      expect(result).toHaveLength(1);
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
          }),
          orderBy: expect.any(Object),
        })
      );
    });

    it("should filter by time range", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getTrendingPosts({
        limit: 10,
        timeRange: "week",
      });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe("reportPost", () => {
    it("should report a post", async () => {
      mockPrisma.post.update.mockResolvedValue({
        ...mockPost,
        reportedCount: 1,
      });

      await service.reportPost("post-1", "user-2", "spam");

      expect(mockPrisma.post.update).toHaveBeenCalled();
    });

    it("should not allow reporting own post", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      await expect(
        service.reportPost("post-1", "user-1", "spam")
      ).rejects.toThrow("Cannot report your own post");
    });

    it("should not allow duplicate reports", async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      mockPrisma.post.update.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      await expect(
        service.reportPost("post-1", "user-2", "spam")
      ).rejects.toThrow();
    });
  });

  describe("searchUsers", () => {
    it("should search users by name", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-1", name: "Alice", image: null },
      ]);

      const result = await service.searchUsers("alice");

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: "alice",
              mode: "insensitive",
            }),
          }),
        })
      );
    });

    it("should exclude current user from results", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.searchUsers("user", "user-1");

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({ not: "user-1" }),
          }),
        })
      );
    });
  });
});
