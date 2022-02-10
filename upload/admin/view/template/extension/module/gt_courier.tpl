<?php echo $header; ?><?php echo $column_left; ?>
<div id="content">
    <div class="page-header">
        <div class="container-fluid">
            <h1>GT Courier</h1>           
            <ul class="breadcrumb">
                <?php foreach ($breadcrumbs as $breadcrumb) { ?>
                <li><a href="<?php echo $breadcrumb['href']; ?>"><?php echo $breadcrumb['text']; ?></a></li>
                <?php } ?>
            </ul>
        </div>
    </div>
    <div class="container-fluid">
         <script>   
            window.gt_courier_settings = <?php echo $gt_courier_settings; ?>;
            window.gt_module_save_settings_link = "<?php echo $gt_module_save_settings_link; ?>";
            window.order_status_add_link = "<?php echo $order_status_add_link; ?>";
            window.token = "<?php echo $token; ?>";
            window.is_order_status_added = "<?php echo $is_order_status_added; ?>";
         </script>

         <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="panel-title"><i class="fa fa-pencil"></i> Επεξεργασία</h3>
            </div>
            <div class="panel-body">
                <div id="settingsRoot"></div>
            </div>
         </div>
    </div>
</div>

<script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" src="view/javascript/gt_courier/settings.js"></script>
<?php echo $footer; ?>