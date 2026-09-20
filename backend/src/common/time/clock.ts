import { Injectable } from '@nestjs/common';

export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

@Injectable()
export class RealClock implements Clock {
  now(): Date {
    return new Date();
  }
}