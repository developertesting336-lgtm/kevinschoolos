import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "./index";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useAppSelector = useSelector.withTypes<any>();
