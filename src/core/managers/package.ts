import { api, inquirer } from '@cliz/cli';
import * as config from '@znode/config';
import * as path from 'path';
import * as semver from 'semver';
import { Event as EventEmitter } from '@zodash/event';
import { runInShell } from '../utils';

export interface IPackageManager {
  release(option?: ReleaseOptions): Promise<void>;
}

export interface ReleaseOptions {}

export class PackageManager implements IPackageManager {
  public readonly config = new PackageManagerConfig<{
    release?: string | string[];
  }>();

  public async release() {
    const releaseCommand = this.config.get('release');
    if (releaseCommand) {
      const commands = Array.isArray(releaseCommand)
        ? releaseCommand
        : [releaseCommand];
      return new Promise<void>((resolve) => {
        const pl = pipeline(commands);
        pl.on('error', (e: any) => process.stderr.write(e));
        pl.on('data', (e: any) => process.stdout.write(e));
        pl.on('exit', () => {
          resolve();
        });
      });
    }

    // Node.js
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (!api.fs.exist(pkgPath)) {
      throw new Error(`Cannot found package.json in current path`);
    }

    const pkg = await api.fs.json.load(pkgPath);
    const answers = await inquirer.prompt([
      {
        name: 'newVersion',
        type: 'text',
        message: 'New version ?',
        default: semver.inc(pkg.version, 'patch'),
        validate: (newVersion) => {
          if (!newVersion) throw new Error(`New version is required`);
          if (!semver.gt(newVersion, pkg.version)) {
            throw new Error(`New version should large than ${pkg.version}`);
          }

          return true;
        },
      },
    ]);

    const newVersion = (pkg.version = answers.newVersion as any as string);
    // sorted
    api.fs.writeFile(pkgPath, JSON.stringify(sortPackageJSON(pkg), null, 2));
    const tag = `v${newVersion}`;
    await api.$`git tag ${tag}`;

    await runInShell(`git push origin ${tag}`);
  }

  public async prepare() {
    await this.config.prepare();
  }
}

export class PackageManagerConfig<Config extends object> {
  public path = path.join(process.cwd(), '.gpm.yml'); // $PWD/.gpm.yml
  private _config: Config;

  public isReady = false;

  constructor() {}

  private async load() {
    if (await api.fs.exist(this.path)) {
      console.log('xxx:');
      this._config = await config.load({ path: this.path });
    } else {
      this._config = {} as any;
    }

    this.isReady = true;
  }

  private async sync() {
    // sort config
    const config = Object.keys(this._config)
      .sort((a, b) => a.localeCompare(b))
      .reduce((all, path) => {
        all[path] = this._config[path];
        return all;
      }, {} as Config);

    await api.fs.yml.write(this.path, config);
  }

  private ensure() {
    if (!this.isReady) {
      throw new Error(`config is not ready`);
    }
  }

  public async prepare() {
    await this.load();
  }

  public get<K extends keyof Config>(key: K): Config[K] {
    this.ensure();

    return this._config[key];
  }

  public set<K extends keyof Config>(key: string, value: Config[K]) {
    this.ensure();

    if (!value) {
      delete this._config[key];
    } else {
      this._config[key] = value;
    }

    this.sync().catch((error) => console.error('config sync error:', error));
  }

  public getAll(): Config {
    return this._config;
  }
}

// sort-package-json
function sortPackageJSON(pkg: object) {
  const fields = [
    { key: '$schema' },
    { key: 'name' },
    /* vscode */ { key: 'displayName' },
    { key: 'version' },
    { key: 'private' },
    { key: 'description' },
    /* vscode */ { key: 'categories' },
    { key: 'keywords' },
    { key: 'homepage' },
    { key: 'bugs' },
    { key: 'repository' },
    { key: 'funding' },
    { key: 'license' },
    /* vscode */ { key: 'qna' },
    { key: 'author' },
    {
      key: 'maintainers',
    },
    {
      key: 'contributors',
    },
    /* vscode */ { key: 'publisher' },
    { key: 'sideEffects' },
    { key: 'type' },
    { key: 'imports' },
    { key: 'exports' },
    { key: 'main' },
    { key: 'umd:main' },
    { key: 'jsdelivr' },
    { key: 'unpkg' },
    { key: 'module' },
    { key: 'source' },
    { key: 'jsnext:main' },
    { key: 'browser' },
    { key: 'types' },
    { key: 'typesVersions' },
    { key: 'typings' },
    { key: 'style' },
    { key: 'example' },
    { key: 'examplestyle' },
    { key: 'assets' },
    { key: 'bin' },
    { key: 'man' },
    { key: 'directories' },
    { key: 'files' },
    { key: 'workspaces' },
    // node-pre-gyp https://www.npmjs.com/package/node-pre-gyp#1-add-new-entries-to-your-packagejson
    {
      key: 'binary',
    },
    { key: 'scripts' },
    { key: 'betterScripts' },
    /* vscode */ { key: 'contributes' },
    /* vscode */ { key: 'activationEvents' },
    { key: 'husky' },
    { key: 'simple-git-hooks' },
    { key: 'pre-commit' },
    { key: 'commitlint' },
    { key: 'lint-staged' },
    { key: 'config' },
    { key: 'nodemonConfig' },
    { key: 'browserify' },
    { key: 'babel' },
    { key: 'browserslist' },
    { key: 'xo' },
    { key: 'prettier' },
    { key: 'eslintConfig' },
    { key: 'eslintIgnore' },
    { key: 'npmpkgjsonlint' },
    { key: 'npmPackageJsonLintConfig' },
    { key: 'npmpackagejsonlint' },
    { key: 'release' },
    { key: 'remarkConfig' },
    { key: 'stylelint' },
    { key: 'ava' },
    { key: 'jest' },
    { key: 'mocha' },
    { key: 'nyc' },
    { key: 'c8' },
    { key: 'tap' },
    { key: 'resolutions' },
    { key: 'dependencies' },
    { key: 'devDependencies' },
    { key: 'dependenciesMeta' },
    { key: 'peerDependencies' },
    // TODO: only sort depth = 2
    { key: 'peerDependenciesMeta' },
    { key: 'optionalDependencies' },
    { key: 'bundledDependencies' },
    { key: 'bundleDependencies' },
    /* vscode */ { key: 'extensionPack' },
    /* vscode */ { key: 'extensionDependencies' },
    { key: 'flat' },
    { key: 'engines' },
    { key: 'engineStrict' },
    { key: 'languageName' },
    { key: 'os' },
    { key: 'cpu' },
    { key: 'preferGlobal' },
    { key: 'publishConfig' },
    /* vscode */ { key: 'icon' },
    /* vscode */ {
      key: 'badges',
    },
    /* vscode */ { key: 'galleryBanner' },
    /* vscode */ { key: 'preview' },
    /* vscode */ { key: 'markdown' },
  ];

  const _pkg = {};
  for (const field of fields) {
    if (pkg[field.key]) {
      _pkg[field.key] = pkg[field.key];
      delete pkg[field.key];
    }
  }

  // rest
  if (Object.keys(pkg).length !== 0) {
    for (const key in pkg) {
      _pkg[key] = pkg[key];
    }
  }

  return _pkg;
}

function pipeline(commands: string[]) {
  const emitter = new EventEmitter();

  async function run() {
    try {
      for (const command of commands) {
        await new Promise<void>((resolve) => {
          const child = api.$.spawn(command);
          child.on('error', (e: any) => emitter.emit('data', e));
          child.on('data', (e: any) => emitter.emit('data', e));
          child.on('exit', () => {
            resolve();
          });
        });
      }

      emitter.emit('exit');
    } catch (error) {
      emitter.emit('error', error);
    }
  }

  run();

  return emitter;
}