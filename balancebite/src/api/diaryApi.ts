import axios from 'axios';

const api = axios.create({
  baseURL: '/api/diary', // Проверь префикс в твоем server.js
  withCredentials: true,
});

export const getDiary = async (date: string) => {
  const response = await api.get(`/meals?date=${date}`);
  return response.data;
};

export const deleteMeal = async (mealId: string) => {
  const response = await api.delete(`/meals/${mealId}`);
  return response.data;
};

export const deleteEntry = async (mealId: string, entryId: string) => {
  const response = await api.delete(`/meals/${mealId}/entries/${entryId}`);
  return response.data;
};
