/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as aggregates from "../aggregates.js";
import type * as categories from "../categories.js";
import type * as clients from "../clients.js";
import type * as functions from "../functions.js";
import type * as model_analytics from "../model/analytics.js";
import type * as projects from "../projects.js";
import type * as time_entries from "../time_entries.js";
import type * as types from "../types.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  aggregates: typeof aggregates;
  categories: typeof categories;
  clients: typeof clients;
  functions: typeof functions;
  "model/analytics": typeof model_analytics;
  projects: typeof projects;
  time_entries: typeof time_entries;
  types: typeof types;
  utils: typeof utils;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
