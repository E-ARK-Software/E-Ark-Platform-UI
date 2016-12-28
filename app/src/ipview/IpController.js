angular
    .module('eArkPlatform.ipview')
    .controller('IpController', IpController);

function IpController($q, $state, $stateParams, $mdDialog, ipViewService, orderService) {

    var ipc = this;

    ipc.checkAll = false;
    ipc.workingDirectory = false;

    ipc.orderId = $stateParams.orderId;
    ipc.children = [];
    ipc.selectedItems = [];
    ipc.orderBy = '-name';
    ipc.searchForm = {};
    ipc.itemInfo = false;
    ipc.path = $stateParams.path ? $stateParams.path : '/';
    ipc.orderStatus = $stateParams.orderStatus ? $stateParams.orderStatus : '';
    ipc.dipId = $stateParams.dipId;
    
    ipc.bcpath = pathToBreadCrumb(ipc.path);
    ipc.viewContent = viewContent;
    ipc.sortThis = sortThis;
    ipc.searchIP = searchIp;
    ipc.toggleSearchField = toggleSearchField;
    ipc.selectItem = itemSelect;
    ipc.selectAll = selectAll;
    ipc.clearClipboard = clearClipboard;
    ipc.toClipboard = toClipboard;
    ipc.order = '';
    ipc.statusEnum = {
        error: 0,
        new : 1,
        open : 2,
        submitted : 3,
        processing : 4,
        packaging : 5,
        ready : 6
    };

    if ($stateParams.linkBack) {
        ipc.linkBack = $stateParams.linkBack;
    } else {
        ipc.linkBack = false;
    }
    
    resolvePath();

    function resolvePath() {
        var defer = $q.defer();
        if ($stateParams.orderId) {
            orderService.getOrderDetail(ipc.orderId).then(function (response) {
                ipc.order = response;
                listDir();
                defer.resolve(true);
            });
        } else {
            defer.resolve(true);
            listDir();
        }
        return defer.promise;
    }

    function listDir() {
        if(ipc.path)
            getItemInfo(ipc.path);
        var orderStatus  = '';
        if(ipc.order && ipc.order.orderStatus){
            orderStatus = ipc.order.orderStatus;
            if(ipc.statusEnum[ipc.order.orderStatus] > 4 && ipc.path.split("/").length <= 2) {
                ipc.path = ipc.order.dipId;
                ipc.workingDirectory = true;
            }
            if (ipc.path[0] != '/')
                ipc.path = '/'+ipc.path;
        }

        var action = ipViewService.serializeObj({action: 'list', path: ipc.path, orderStatus: orderStatus});
        ipViewService.executeAction(action).then(function(response) {
                ipc.children = response.children;
                //since we have new children, clear the selected items buffer
                ipc.selectedItems =[];
            },
            function (err) {
                console.log('Error listing directory contents' + err.message);
                errorService.displayErrorMsg($translate.instant('IPVIEW.ERROR.MESSAGE.DIR_LISTING_ERROR'));
            }
        );
    }

    function viewContent(item) {
        if (item.type === 'directory') {
            $state.go('ipviewer', {path: item.path});
        } else {
            $state.go('ipviewer.file', {path: item.path});
        }
    }

    function getItemInfo(path) {
        console.log('getting item info for ' + path);
        var action = ipViewService.serializeObj({action: 'getinfo', path: path});
        ipViewService.executeAction(action).then(
            function (response) {
                if (response !== undefined && response.error !== 404) {
                    console.log('There is a response');
                    console.log(response);
                    ipc.itemInfo = response;
                }
            },
            function (err) {
                console.log('Error: ' + err.message);
            }
        );
    }

    // Clean up response data for UI itemInfo
    function dataDigest(obj) {
        Object.keys(obj).forEach(function (key) {
            if(typeof obj[key] === 'object') {
                dataDigest(obj[key]);
            } else {
                var readableKey = key.replace(/[@#]/g, '');
                ipc.itemInfo.push({ label: readableKey, value: obj[key] });
            }
        });
    }

    function pathToBreadCrumb(path) {
        var bc = [];
        var pathParts = path.split('/');
        var currentPath = '';
        for (var p in pathParts) {
            if (pathParts[p] !== '') {
                currentPath = currentPath + '/' + pathParts[p];
                bc.push({
                    title: pathParts[p],
                    path: currentPath
                });
            }
        }
        return bc;
    }

    function sortThis($event, sortParameter) {
        if (ipc.orderBy === sortParameter) {
            ipc.orderBy = '-' + sortParameter;
        } else if (ipc.orderBy === '-' + sortParameter) {
            ipc.orderBy = '';
        } else {
            ipc.orderBy = sortParameter;
        }
    }

    function searchIp(term) {
        $state.go('ipviewer.search', {path: ipc.bcpath[0].path, term: term, dipId: ipc.dipId});
    }

    function toggleSearchField() {
        !ipc.searchForm.visible ? ipc.searchForm.visible = true : ipc.searchForm.visible = false;
    }

    // Processing/editing features
    ipc.can_edit = $stateParams.orderStatus === 'processing';
    ipc.clipboard = ipViewService.clipboard;
    ipc.copy = copy;
    ipc.mkdir = mkdir;
    ipc.paste = paste;
    ipc.del = del;

    /**
     * Selects or deselects an item in view
     * @param item
     */
    function itemSelect(item){
        ipc.checkAll = false;
        if(item.selected){
            var pIndex = ipc.selectedItems.findIndex(function (selectedItem) {
                return selectedItem.path == item.path;
            });
            if(pIndex != -1){
                ipc.selectedItems.splice(pIndex, 1);
                item.selected = false;
            }
        }
        else{
            item.selected = true;
            ipc.selectedItems.push(item);
        }
        console.log('Selected(single) items: ',ipc.selectedItems);
    }

    /**
     * Selects all elements in current view
     */
    function selectAll(){
        ipc.selectedItems = [];
        ipc.children.forEach(function(item){
            item.selected = true;
            ipc.selectedItems.push(item);
        });
        console.log('Selected(all) items: ',ipc.selectedItems);
    }
    
    function copy(item) {
        if(ipViewService.clipboard.length == 0){
            ipViewService.clipboard = [item];
            ipc.clipboard = ipViewService.clipboard;
        }
        else {
            ipViewService.clipboard.push(item);
        }
    }

    /**
     * Clears everything from the clip board
     */
    function clearClipboard() {
        ipViewService.clipboard = [];
        ipc.clipboard = [];
    }
    /**
     * Clears everything from the clip board
     */
    function toClipboard() {
        if (ipViewService.clipboard.length <= 0)
            ipViewService.clipboard = ipc.selectedItems;
        else
            ipViewService.clipboard.push(ipc.selectedItems);

        ipc.clipboard = ipViewService.clipboard;
    }
    
    function mkdir(ev, path) {
        var parentEl = angular.element(document.body);
        $mdDialog.show({
            parent: parentEl,
            targetEvent: ev,
            templateUrl: 'app/src/ipview/view/mkdirDiag.html',
            locals: {
                
            },
            controller: DialogController
        });
        function DialogController($scope, $mdDialog) {
            $scope.dirName = '';
            $scope.closeDialog = function() {
                $mdDialog.hide();
            };
            $scope.createDir = function() {
                $mdDialog.hide();
                var newPath = path + '/' + $scope.dirName;
                var action = ipViewService.serializeObj({ action: 'mkdir', path: newPath });
                ipViewService.executeAction(action).then(
                    function (response) {
                        console.log('Folder created');
                        resolvePath();
                    },
                    function (err) {
                        alert('Cannot create folder');
                        console.log(err);
                    }
                );
            };
        }
    }
    
    function paste(path) {
        console.log('Copying:');
        console.log(ipc.clipboard);
        console.log(path);
        var items = [];
        ipc.clipboard.forEach(function(item){
            items.push(item.path);
        });
        var action = ipViewService.serializeObj({ action: 'copy', source: items, destination: path });
        console.log("Action to be persisted: "+ action);
        ipViewService.executeAction(action).then(
            function (response) {
                console.log('Content copied');
                console.log(response);
                ipc.clipboard = '';
                ipViewService.clipboard = '';
                resolvePath();
            },
            function (err) {
                alert('Cannot copy content');
                console.log(err);
            }
        );
    }
    
    function del(path) {
        console.log('Deleting ' + path);
        var action = ipViewService.serializeObj({ action: 'delete', path: path });
        ipViewService.executeAction(action).then(
            function (response) {
                console.log('Content deleted');
                resolvePath();
            },
            function (err) {
                alert('Cannot delete content');
                console.log(err);
            }
        );
    }



}
