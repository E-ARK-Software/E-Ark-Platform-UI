angular
    .module('eArkPlatform.files')
    .controller('AddFileDialogController', AddFileDialogController);


function AddFileDialogController($mdDialog, $translate, filesService, notificationUtilsService) {
    var addFileVm = this;
    addFileVm.owner = null;
    addFileVm.files = null;
    addFileVm.comment = null;
    addFileVm.addFiles = addFiles;
    addFileVm.cancel = cancel;

    function addFiles() {
        filesService.uploadFiles(addFileVm.owner, addFileVm.files, addFileVm.comment)
            .then(function () {
                if (addFileVm.files.length > 1) {
                    notificationUtilsService.notify($translate.instant("FILE.N_FILES_UPLOADED_SUCCESSFULLY", {'n': addFileVm.files.length}));
                } else {
                    notificationUtilsService.notify($translate.instant("FILE.FILE_UPLOADED_SUCCESSFULLY", {'title': addFileVm.files[0].name}));
                }
                $mdDialog.hide();
            }, function (response) {
                notificationUtilsService.alert(response.data.message || 'Unexpected exception');
            });
    }

    function cancel() {
        $mdDialog.cancel();
    }
}
