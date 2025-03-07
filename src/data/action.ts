import {
  mdiAbTesting,
  mdiArrowDecision,
  mdiCallSplit,
  mdiChevronRight,
  mdiCloseOctagon,
  mdiDevices,
  mdiExclamation,
  mdiPalette,
  mdiPlay,
  mdiRefresh,
  mdiShuffleDisabled,
  mdiTimerOutline,
  mdiTrafficLight,
} from "@mdi/js";

export const ACTION_TYPES = {
  condition: mdiAbTesting,
  delay: mdiTimerOutline,
  event: mdiExclamation,
  play_media: mdiPlay,
  activate_scene: mdiPalette,
  service: mdiChevronRight,
  wait_template: mdiTrafficLight,
  wait_for_trigger: mdiTrafficLight,
  repeat: mdiRefresh,
  choose: mdiArrowDecision,
  if: mdiCallSplit,
  device_id: mdiDevices,
  stop: mdiCloseOctagon,
  parallel: mdiShuffleDisabled,
};
