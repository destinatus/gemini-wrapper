import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class JsonResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Skip if data is undefined or already stringified
        if (!data || typeof data !== 'object') {
          return data;
        }
        // Ensure proper JSON formatting by stringifying and parsing
        try {
          const stringified = JSON.stringify(data, null, 2);
          return JSON.parse(stringified);
        } catch (error) {
          return data;
        }
      }),
    );
  }
}
