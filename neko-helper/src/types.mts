export type JSONValue = string | number | boolean | null | undefined | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = JSONValue[];

export type LockHandle = {
  isExpired: () => Promise<boolean>;
  release: () => Promise<void>;
}