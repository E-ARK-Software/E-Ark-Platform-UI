
    angular
        .module('angularStubApp.dashboard')
        .controller('DashboardController', DashboardController);

    function DashboardController($scope, authService, dashboardService) {
        var vm = this;
        vm.dashlets = dashboardService.getDashlets();
    }