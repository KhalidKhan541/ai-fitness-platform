import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Post,
  Comment,
  Feed,
  Notification,
  SocialUser,
  SocialStats,
  TrendingTag,
} from "@/types";

interface SocialState {
  feed: Feed;
  notifications: Notification[];
  trendingTags: TrendingTag[];
  followedUsers: string[];
  blockedUsers: string[];
  socialStats: SocialStats;
  isLoading: boolean;

  setFeed: (feed: Feed) => void;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  likePost: (postId: string) => void;
  unlikePost: (postId: string) => void;
  bookmarkPost: (postId: string) => void;
  unbookmarkPost: (postId: string) => void;

  addComment: (postId: string, comment: Comment) => void;
  updateComment: (
    postId: string,
    commentId: string,
    updates: Partial<Comment>
  ) => void;
  removeComment: (postId: string, commentId: string) => void;
  likeComment: (postId: string, commentId: string) => void;
  unlikeComment: (postId: string, commentId: string) => void;

  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;

  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  isFollowing: (userId: string) => boolean;

  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;

  setTrendingTags: (tags: TrendingTag[]) => void;
  setSocialStats: (stats: SocialStats) => void;
  setIsLoading: (isLoading: boolean) => void;

  getUnreadCount: () => number;
  getPostsByUser: (userId: string) => Post[];
  getBookmarkedPosts: () => Post[];
}

export const useSocialStore = create<SocialState>()(
  persist(
    immer((set, get) => ({
      feed: {
        posts: [],
        hasMore: true,
      },
      notifications: [],
      trendingTags: [],
      followedUsers: [],
      blockedUsers: [],
      socialStats: {
        followers: 0,
        following: 0,
        posts: 0,
        totalLikes: 0,
        totalComments: 0,
      },
      isLoading: false,

      setFeed: (feed) =>
        set((state) => {
          state.feed = feed;
        }),

      addPost: (post) =>
        set((state) => {
          state.feed.posts.unshift(post);
          state.socialStats.posts += 1;
        }),

      updatePost: (postId, updates) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            Object.assign(post, updates);
          }
        }),

      removePost: (postId) =>
        set((state) => {
          state.feed.posts = state.feed.posts.filter((p) => p.id !== postId);
          state.socialStats.posts = Math.max(0, state.socialStats.posts - 1);
        }),

      likePost: (postId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post && !post.isLiked) {
            post.isLiked = true;
            post.likes += 1;
          }
        }),

      unlikePost: (postId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post && post.isLiked) {
            post.isLiked = false;
            post.likes = Math.max(0, post.likes - 1);
          }
        }),

      bookmarkPost: (postId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            post.isBookmarked = true;
          }
        }),

      unbookmarkPost: (postId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            post.isBookmarked = false;
          }
        }),

      addComment: (postId, comment) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            if (comment.parentCommentId) {
              const parentComment = post.comments.find(
                (c) => c.id === comment.parentCommentId
              );
              if (parentComment) {
                parentComment.replies.push(comment);
              }
            } else {
              post.comments.push(comment);
            }
            post.comments += 1;
          }
        }),

      updateComment: (postId, commentId, updates) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            const comment = post.comments.find((c) => c.id === commentId);
            if (comment) {
              Object.assign(comment, updates);
            }
          }
        }),

      removeComment: (postId, commentId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            post.comments = post.comments.filter((c) => c.id !== commentId);
            post.comments = Math.max(0, post.comments - 1);
          }
        }),

      likeComment: (postId, commentId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            const comment = post.comments.find((c) => c.id === commentId);
            if (comment && !comment.isLiked) {
              comment.isLiked = true;
              comment.likes += 1;
            }
          }
        }),

      unlikeComment: (postId, commentId) =>
        set((state) => {
          const post = state.feed.posts.find((p) => p.id === postId);
          if (post) {
            const comment = post.comments.find((c) => c.id === commentId);
            if (comment && comment.isLiked) {
              comment.isLiked = false;
              comment.likes = Math.max(0, comment.likes - 1);
            }
          }
        }),

      addNotification: (notification) =>
        set((state) => {
          state.notifications.unshift(notification);
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100);
          }
        }),

      markNotificationRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(
            (n) => n.id === notificationId
          );
          if (notification) {
            notification.read = true;
            notification.readAt = new Date().toISOString();
          }
        }),

      markAllNotificationsRead: () =>
        set((state) => {
          const now = new Date().toISOString();
          state.notifications.forEach((n) => {
            if (!n.read) {
              n.read = true;
              n.readAt = now;
            }
          });
        }),

      removeNotification: (notificationId) =>
        set((state) => {
          state.notifications = state.notifications.filter(
            (n) => n.id !== notificationId
          );
        }),

      clearNotifications: () =>
        set((state) => {
          state.notifications = [];
        }),

      followUser: (userId) =>
        set((state) => {
          if (!state.followedUsers.includes(userId)) {
            state.followedUsers.push(userId);
            state.socialStats.following += 1;
          }
        }),

      unfollowUser: (userId) =>
        set((state) => {
          state.followedUsers = state.followedUsers.filter(
            (id) => id !== userId
          );
          state.socialStats.following = Math.max(
            0,
            state.socialStats.following - 1
          );
        }),

      isFollowing: (userId) => {
        return get().followedUsers.includes(userId);
      },

      blockUser: (userId) =>
        set((state) => {
          if (!state.blockedUsers.includes(userId)) {
            state.blockedUsers.push(userId);
          }
        }),

      unblockUser: (userId) =>
        set((state) => {
          state.blockedUsers = state.blockedUsers.filter(
            (id) => id !== userId
          );
        }),

      isBlocked: (userId) => {
        return get().blockedUsers.includes(userId);
      },

      setTrendingTags: (tags) =>
        set((state) => {
          state.trendingTags = tags;
        }),

      setSocialStats: (stats) =>
        set((state) => {
          state.socialStats = stats;
        }),

      setIsLoading: (isLoading) =>
        set((state) => {
          state.isLoading = isLoading;
        }),

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },

      getPostsByUser: (userId) => {
        return get().feed.posts.filter((p) => p.userId === userId);
      },

      getBookmarkedPosts: () => {
        return get().feed.posts.filter((p) => p.isBookmarked);
      },
    })),
    {
      name: "aifitness-social",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        followedUsers: state.followedUsers,
        blockedUsers: state.blockedUsers,
        socialStats: state.socialStats,
      }),
    }
  )
);
