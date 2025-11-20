import { ProjectApi } from "./projects";
import { styleGuideApi } from "./style-guide";
import { generationApi } from "./generation";

//centralized api export
export const apis = [ProjectApi, styleGuideApi, generationApi];
