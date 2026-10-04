import express from "express";
import {
  createSharedWorkout,
  getTrainerSharedWorkouts,
  updateSharedWorkout,
  deleteSharedWorkout,
  getTrainerAssignments,
  continueAssignedWorkout,
  completeAssignedWorkout,
  generateShareableLink,
  getSharedWorkoutByToken,
  saveSharedWorkoutToAccount,
  getTrainerClients,
  generateClientShareableLink,
  getClientWorkoutsByToken,
  claimClientWorkoutsByToken,
} from "../controllers/sharedWorkout.controller.js";
import { verifyIdToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/", verifyIdToken, createSharedWorkout);
router.get("/trainer", verifyIdToken, getTrainerSharedWorkouts);
router.get("/clients", verifyIdToken, getTrainerClients);

router.get("/assignments/trainer", verifyIdToken, getTrainerAssignments);
router.put(
  "/assignments/:shareId/continue",
  verifyIdToken,
  continueAssignedWorkout
);
router.put(
  "/assignments/:shareId/complete",
  verifyIdToken,
  completeAssignedWorkout
);

router.post(
  "/generate-client-link",
  verifyIdToken,
  generateClientShareableLink
);
router.get("/client-claim/:shareToken", getClientWorkoutsByToken);
router.post(
  "/client-claim/:shareToken/claim",
  verifyIdToken,
  claimClientWorkoutsByToken
);

router.get("/shared/:shareToken", getSharedWorkoutByToken);
router.post(
  "/shared/:shareToken/save",
  verifyIdToken,
  saveSharedWorkoutToAccount
);
router.post(
  "/:sharedWorkoutId/generate-link",
  verifyIdToken,
  generateShareableLink
);

router.put("/:sharedWorkoutId", verifyIdToken, updateSharedWorkout);
router.delete("/:sharedWorkoutId", verifyIdToken, deleteSharedWorkout);

export default router;
