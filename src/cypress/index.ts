import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  url
} from "@angular-devkit/schematics";
import { NodePackageInstallTask } from "@angular-devkit/schematics/tasks";
import { Observable, concat, of } from "rxjs";
import { concatMap, map } from "rxjs/operators";

import {
  NodeDependencyType,
  addPackageJsonDependency
} from "../utility/dependencies";
import {
  NodePackage,
  addPropertyToPackageJson,
  getAngularVersion,
  getLatestNodeVersion
} from "../utility/util";

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    _options = { ..._options, __version__: getAngularVersion(tree) };

    return chain([
      updateDependencies(),
      // TODO: setup cli prompt to confirm removal of protractor
      // removeFiles(),
      addCypressFiles(),
      addCypressScriptsToPackageJson()
    ])(tree, _context);
  };
}

function updateDependencies(): Rule {
  return (tree: Tree, context: SchematicContext): Observable<Tree> => {
    context.logger.debug("Updating dependencies...");
    context.addTask(new NodePackageInstallTask());

    // TODO: setup cli prompt to confirm removal of protractor
    // const removeDependencies = of('protractor').pipe(
    //   map((packageName: string) => {
    //     context.logger.debug(`Removing ${packageName} dependency`);

    //     removePackageJsonDependency(tree, {
    //       type: NodeDependencyType.Dev,
    //       name: packageName
    //     });

    //     return tree;
    //   })
    // );

    const addDependencies = of(
      "cypress",
      "@bahmutov/add-typescript-to-cypress"
    ).pipe(
      concatMap((packageName: string) => getLatestNodeVersion(packageName)),
      map((packageFromRegistry: NodePackage) => {
        const { name, version } = packageFromRegistry;
        context.logger.debug(
          `Adding ${name}:${version} to ${NodeDependencyType.Dev}`
        );

        addPackageJsonDependency(tree, {
          type: NodeDependencyType.Dev,
          name,
          version
        });

        return tree;
      })
    );
    // TODO: setup cli prompt to confirm removal of protractor
    return concat(/*removeDependencies,*/ addDependencies);
  };
}

// TODO: setup cli prompt to confirm removal of protractor
// function removeFiles(): Rule {
//   return (tree: Tree, context: SchematicContext) => {
//     context.logger.debug('Removing protractor e2e directory');
//     safeFileDelete(tree, './e2e');

//     return tree;
//   };
// }

function addCypressFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug("Adding cypress files");

    return chain([mergeWith(apply(url("./files"), [move("./")]))])(
      tree,
      context
    );
  };
}

function addCypressScriptsToPackageJson(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // prettier-ignore
    addPropertyToPackageJson(tree, context, 'scripts', {
      "cypress-open": "cypress open",
      "cypress-run": "cypress run"
    });

    return tree;
  };
}
