import axios from 'axios';
import { ErrorResponse } from './types';

export const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.error || error.message || fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};