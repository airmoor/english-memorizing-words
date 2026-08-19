import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { BoardsController } from './boards.controller';

/**
 * Regression guard for the new unauthenticated route: JwtAuthGuard reads
 * IS_PUBLIC_KEY straight off the handler function (see JwtAuthGuard.canActivate),
 * so asserting metadata here is equivalent to asserting the actual runtime
 * auth behavior without standing up a full HTTP/e2e stack.
 *
 * Fails loudly if @Public() is ever added to (or removed from) the wrong
 * method — e.g. accidentally left on the clone endpoint, or on any of the
 * existing private board routes.
 */
describe('BoardsController — @Public() route guard', () => {
  const PUBLIC_METHODS = new Set(['getSharedBoard']);

  const allMethods = Object.getOwnPropertyNames(BoardsController.prototype).filter(
    (name) => name !== 'constructor',
  );

  it('has at least the expected set of routes to check', () => {
    // Sanity check so this test can't silently pass on an empty prototype.
    expect(allMethods.length).toBeGreaterThanOrEqual(9);
  });

  it.each(allMethods)('%s has the expected @Public() status', (methodName) => {
    const handler = (BoardsController.prototype as unknown as Record<string, () => void>)[
      methodName
    ];
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true;
    expect(isPublic).toBe(PUBLIC_METHODS.has(methodName));
  });
});
