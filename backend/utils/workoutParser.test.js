import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseExerciseLine,
  parseWorkoutDescription,
} from "./workoutParser.js";

const setReps = (exercise) => (exercise?.sets || []).map((s) => s.reps);

describe("workoutParser colon set schemes", () => {
  it("parses mixed plain + assisted colon tokens (Chest bicep pattern)", () => {
    const exercise = parseExerciseLine("Assisted Dips 50lbs - 8 6:2 6:2");
    assert.ok(exercise, "expected exercise to parse");
    assert.deepEqual(setReps(exercise), [8, 6, 2, 6, 2]);
    assert.equal(exercise.maxWeight, 50);
    assert.equal(exercise.totalReps, 24);
    // Line weight applied to every segment — no invented assist/drop weights
    assert.ok(exercise.sets.every((s) => s.weight === 50 && s.unit === "lbs"));
  });

  it("parses working:assist tokens like 10:1 and 7:1", () => {
    const exercise = parseExerciseLine("Assisted Pull Ups 80lbs - 10:1 7:1");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [10, 1, 7, 1]);
    assert.equal(exercise.totalReps, 19);
    assert.equal(exercise.maxWeight, 80);
  });

  it("parses multi-part drop-set colon tokens like 9:3 / 4:1:1 (Back tri legs)", () => {
    const exercise = parseExerciseLine(
      "Cable Tricep Pulldown 70lbs - 9:3 7:2 4:1:1",
    );
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [9, 3, 7, 2, 4, 1, 1]);
    assert.equal(exercise.totalReps, 27);
    assert.ok(exercise.sets.every((s) => s.weight === 70));
  });

  it("parses colon schemes without a dash between weight and reps", () => {
    const exercise = parseExerciseLine("Assisted Dips 50lbs 10:1 7:1");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [10, 1, 7, 1]);
  });

  it("parses bodyweight lines that only use colon schemes", () => {
    const exercise = parseExerciseLine("Pull Ups - 6:2 6:2");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [6, 2, 6, 2]);
    assert.equal(exercise.maxWeight, 0);
  });

  it("turns the two skipped Mac entries into ≥1 exercises each", () => {
    // Token patterns from live skippedEmptyLooksLikeLift samples
    // (entry 6af9dd81… Chest bicep; entry 6aef5c3d… Back tri legs)
    const chestBicep = parseWorkoutDescription(
      [
        "Assisted Dips 50lbs - 8 6:2 6:2",
        "Assisted Pull Ups 80lbs - 10:1 7:1",
        "DB Curls 35lbs - 12 12 10",
      ].join("\n"),
    );
    assert.ok(chestBicep.length >= 2);
    assert.deepEqual(setReps(chestBicep[0]), [8, 6, 2, 6, 2]);
    assert.deepEqual(setReps(chestBicep[1]), [10, 1, 7, 1]);

    const backTriLegs = parseWorkoutDescription(
      [
        "Lat Pulldown 120lbs - 9:3",
        "Cable Tricep Pulldown 70lbs - 7:2",
        "Overhead Tri Ext 40lbs - 4:1:1",
      ].join("\n"),
    );
    assert.equal(backTriLegs.length, 3);
    assert.deepEqual(setReps(backTriLegs[0]), [9, 3]);
    assert.deepEqual(setReps(backTriLegs[1]), [7, 2]);
    assert.deepEqual(setReps(backTriLegs[2]), [4, 1, 1]);
  });
});

describe("workoutParser existing formats still work", () => {
  it("parses plain spaced reps", () => {
    const exercise = parseExerciseLine("DumbBell Curls 35lbs - 12 12 10 8");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [12, 12, 10, 8]);
  });

  it("parses NxM multiply notation", () => {
    const exercise = parseExerciseLine("Bench Press 135lbs - 8x2, 7x1, 8x1");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [8, 8, 7, 8]);
  });

  it("parses weight x reps without a dash", () => {
    const exercise = parseExerciseLine("RDL 185 lbs x 8 8 8");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [8, 8, 8]);
    assert.equal(exercise.maxWeight, 185);
  });

  it("parses missing dash between weight and reps", () => {
    const exercise = parseExerciseLine("Bench Press 135lbs 5 5 5");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [5, 5, 5]);
  });

  it("parses mixed plain and multiply tokens with colon nearby", () => {
    const exercise = parseExerciseLine("Row Machine 100lbs - 8x2, 6:2");
    assert.ok(exercise);
    assert.deepEqual(setReps(exercise), [8, 8, 6, 2]);
  });
});
