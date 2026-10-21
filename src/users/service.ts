import { UsersBasicInfoData } from 'bigbluebutton-html-plugin-sdk';
import { ArenaUser } from '../commons/types';
import { DEFAULT_USER_COLOR } from './constants';

export const toArenaUsers = (list: UsersBasicInfoData[]): Record<string, ArenaUser> => (
  Object.fromEntries(list.map((user) => [
    user.userId,
    { name: user.name, color: user.color || DEFAULT_USER_COLOR },
  ]))
);
