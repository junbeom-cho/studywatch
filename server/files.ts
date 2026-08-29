import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 아직 쓰이지 않는 파일 이름을 고른다.
 *
 * 이름을 밀리초 시각만으로 만들면 같은 밀리초에 두 번 저장했을 때 겹친다. 그러면
 * 파일을 덮어쓰거나 UNIQUE 제약에 걸려 저장이 통째로 실패한다. 사람이 두 번 누르는
 * 일은 드물지만, 기기 두 대에서 동시에 올리면 실제로 생긴다.
 */
export function availableName(
  dir: string,
  base: string,
  extension: string,
  isRegistered: (name: string) => boolean,
): string {
  for (let suffix = 0; ; suffix += 1) {
    const name = suffix === 0 ? `${base}.${extension}` : `${base}-${suffix}.${extension}`
    if (!existsSync(resolve(dir, name)) && !isRegistered(name)) return name
  }
}
