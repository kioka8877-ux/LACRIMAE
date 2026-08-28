import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  checkInGuest,
  claimInvitation,
  createInvitation,
  getEventStats,
  getGuests,
  getSeatroomProfile,
  upsertSeatroomProfile,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  seatroom: router({
    profile: protectedProcedure.query(({ ctx }) => getSeatroomProfile(ctx.user.id)),
    claimInvitation: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user.email) return null;
      return claimInvitation(ctx.user.id, ctx.user.email);
    }),
    setRole: protectedProcedure
      .input(z.object({
        role: z.enum(["organizer", "agent"]),
        eventId: z.string().max(128).optional(),
        displayName: z.string().max(160).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Force agent role if an invitation exists for this email
        if (ctx.user.email) {
          const invitation = await getInvitationByEmail(ctx.user.email);
          if (invitation) {
            return claimInvitation(ctx.user.id, ctx.user.email);
          }
        }
        
        // If no invitation, only allow "organizer" for new direct signups
        const finalRole = input.role === "agent" ? "organizer" : input.role;

        return upsertSeatroomProfile({
          userId: ctx.user.id,
          seatRoomRole: finalRole,
          eventId: input.eventId ?? "event-grand-bal",
          displayName: input.displayName ?? ctx.user.name ?? ctx.user.email ?? "Utilisateur SeatRoom",
        });
      }),
    stats: protectedProcedure
      .input(z.object({ eventId: z.string() }))
      .query(({ input }) => getEventStats(input.eventId)),
    guests: protectedProcedure
      .input(z.object({ eventId: z.string() }))
      .query(({ input }) => getGuests(input.eventId)),
    checkIn: protectedProcedure
      .input(z.object({ uuid: z.string() }))
      .mutation(({ input }) => checkInGuest(input.uuid)),
    inviteAgent: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["organizer", "agent"]),
        eventId: z.string(),
      }))
      .mutation(({ ctx, input }) => createInvitation({
        email: input.email,
        role: input.role,
        eventId: input.eventId,
        invitedBy: ctx.user.id,
      })),
  }),
});

export type AppRouter = typeof appRouter;
