/* globals fetch */

export const getBaseURL = (base) => {
  const b = new URL('.', base);
  return `${b}`;
};

export const getFile = (url, base) => {
  const realURL = new URL(url, base);

  return fetch(realURL).then(response => response.text());
};

export const stringToFormattedTime = (string) => {
  const num = parseInt(string);

  if (isNaN(num)) return '00:00';

  let min = Math.floor(num / 60) + '';
  while (min.length < 2) min = '0' + min;

  let sec = Math.floor(num % 60) + '';
  while (sec.length < 2) sec = '0' + sec;

  return `${min}:${sec}`;
};
