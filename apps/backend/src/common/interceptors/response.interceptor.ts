import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response already has a `success` key, pass through as-is
        if (data && typeof data === 'object' && 'success' in data) return data;

        // Unwrap paginated responses (must have `page` to avoid matching order objects
        // which also have `items` + `total` fields)
        if (data && typeof data === 'object' && 'items' in data && 'total' in data && 'page' in data) {
          const { items, total, page, limit, ...rest } = data as any;
          return {
            success: true,
            data: items,
            meta: { total, page, limit, ...rest },
          };
        }

        return { success: true, data };
      }),
    );
  }
}
