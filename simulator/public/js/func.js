$(document).ready(function(){


 	/*메뉴*/
 	$('.sub>ul>li>a').on('click',function(){
 		if($(this).next().hasClass('show')){
 			$('.sub>ul>li>ul').removeClass('show').slideUp();
 			
 		}else{
 			$('.sub>ul>li>ul').removeClass('show').stop().slideUp();	
 			$(this).next().addClass('show').stop().slideDown();
 		}
 		
 		
 	});

 	$('.sub>ul>li>ul>li>a').on('click',function(){
 		$(this).parent().siblings().removeClass('active');
 		$(this).parent().addClass('active');
 	});
});