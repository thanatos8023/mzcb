$(document).ready(function(){
 	/*메뉴*/
	$('.sub-list>li>a').on('click',function(){
		if ($(this).parent().hasClass('active')) {
			$(this).parent().removeClass('active');
		}else{
			$(this).parent().siblings().removeClass('active');
			$(this).parent().addClass('active');
		}
		 
		if($(this).next().hasClass('show')){
			$('.sub-list>li>ul').removeClass('show').slideUp();
 		}else{
			$('.sub-list>li>ul').removeClass('show').stop().slideUp();	
 			$(this).next().addClass('show').stop().slideDown();
		 }
	 });

	(function ($) {
		$(window).on("load", function () {
			$(".sub").mCustomScrollbar();
		});
	})(jQuery);
});