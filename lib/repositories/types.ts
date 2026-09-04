/** Repository methods may be synchronous in the development adapter and
 * asynchronous when backed by PostgreSQL. Application boundaries should
 * always `await` the result. */
export type RepositoryResult<T> = T | Promise<T>;
