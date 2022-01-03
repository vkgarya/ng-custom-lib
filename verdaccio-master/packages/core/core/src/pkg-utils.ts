import { Package } from '@verdaccio/types';
import semver from 'semver';
import { DIST_TAGS } from './constants';

/**
 * Function filters out bad semver versions and sorts the array.
 * @return {Array} sorted Array
 */
export function semverSort(listVersions: string[]): string[] {
  return listVersions
    .filter(function (x): boolean {
      if (!semver.parse(x, true)) {
        return false;
      }
      return true;
    })
    .sort(semver.compareLoose)
    .map(String);
}

/**
 * Get the latest publihsed version of a package.
 * @param package metadata
 **/
export function getLatest(pkg: Package): string {
  const listVersions: string[] = Object.keys(pkg.versions);
  if (listVersions.length < 1) {
    throw Error('cannot get lastest version of none');
  }

  const versions: string[] = semverSort(listVersions);
  const latest: string | undefined = pkg[DIST_TAGS]?.latest ? pkg[DIST_TAGS].latest : versions[0];

  return latest;
}

/**
 * Function gets a local info and an info from uplinks and tries to merge it
 exported for unit tests only.
  * @param {*} local
  * @param {*} upstream
  * @param {*} config sds
  */
export function mergeVersions(local: Package, upstream: Package) {
  // copy new versions to a cache
  // NOTE: if a certain version was updated, we can't refresh it reliably
  for (const i in upstream.versions) {
    if (typeof local.versions[i] === 'undefined') {
      local.versions[i] = upstream.versions[i];
    }
  }

  for (const i in upstream[DIST_TAGS]) {
    if (local[DIST_TAGS][i] !== upstream[DIST_TAGS][i]) {
      if (!local[DIST_TAGS][i] || semver.lte(local[DIST_TAGS][i], upstream[DIST_TAGS][i])) {
        local[DIST_TAGS][i] = upstream[DIST_TAGS][i];
      }
      if (i === 'latest' && local[DIST_TAGS][i] === upstream[DIST_TAGS][i]) {
        // if remote has more fresh package, we should borrow its readme
        local.readme = upstream.readme;
      }
    }
  }
}
