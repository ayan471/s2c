import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Profile } from "@/types/user";

// Profile state is directly the Profile object (not nested in .user)
type ProfileState = Profile | null;
const initialState: ProfileState = null;

const slice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile(_state, action: PayloadAction<ProfileState>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return action.payload as any;
    },
    clearProfile() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return null as any;
    },
  },
});

export const { setProfile, clearProfile } = slice.actions;
export default slice.reducer;
