import PrimitivePipeline from '../Scene/PrimitivePipeline';
import createTaskProcessorWorker from './createTaskProcessorWorker';
import defined from '../Core/defined';

/*
NOTE:  This needs to be done because during the rollup process, cesiumWorkers is declared twice if used in scope.
       Using 'self' allows for a reference to be made to the top scope of the web worker where cesiumWorkers is declared,
       without rollup detecting it and replacing it with an additional reference.
*/

function getModule(moduleName) {
    return self['cesiumWorkers'][moduleName];
}

function createGeometry(parameters, transferableObjects) {
    var subTasks = parameters.subTasks;
    var length = subTasks.length;
    var resultsOrPromises = new Array(length);

    for (var i = 0; i < length; i++) {
        var task = subTasks[i];
        var geometry = task.geometry;
        var moduleName = task.moduleName;

        if (defined(moduleName)) {
            var createFunction = getModule(moduleName);
            resultsOrPromises[i] = createFunction(geometry, task.offset);
        } else {
            //Already created geometry
            resultsOrPromises[i] = geometry;
        }
    }

    return Promise.all(resultsOrPromises).then(function (results) {
        return PrimitivePipeline.packCreateGeometryResults(results, transferableObjects);
    });
}

export default createTaskProcessorWorker(createGeometry);

