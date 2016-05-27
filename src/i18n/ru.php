<?php
return array(
    "title" => "Проекты и задачи",
    'roles' => array(
        '10' => 'Чтение',
        '30' => 'Запись',
        '50' => 'Администрирование'
    ),
    "bosmenu" => array(
        "botask" => "Проекты и задачи"
    ),
    'brick' => array(
        'templates' => array(
            "5" => "Приглашение к обсуждению задачи \"{v#tl}\"",
            "6" => "<p>
		Пользователь <b>{v#unm}</b> опубликовал(а) новую задачу <a href='{v#plnk}'>{v#tl}</a>
		и пригласил(а) Вас к его обсуждению.
	</p>
	<p>Текст задачи:</p>
	<blockquote>
	{v#prj}
	</blockquote>
	
	<p>С наилучшими пожеланиями,<br />
	 {v#sitename}</p>
<p style='font-size:10px;font-family: tahoma, verdana, arial, sans-serif;color:#999999;'>
	Сообщение было отправлено на ваш {v#email} 
</p>
				",
            "105" => "Приглашение к обсуждению проекта \"{v#tl}\"",
            "106" => "<p>
		Пользователь <b>{v#unm}</b> опубликовал(а) новый проект <a href='{v#plnk}'>{v#tl}</a>
		и пригласил(а) Вас к его обсуждению.
	</p>
	<p>Текст проекта:</p>
	<blockquote>
	{v#prj}
	</blockquote>
	<p>С наилучшими пожеланиями,<br />
	 {v#sitename}</p>
<p style='font-size:10px;font-family: tahoma, verdana, arial, sans-serif;color:#999999;'>
	Сообщение было отправлено на ваш {v#email} 
</p>
				",
        )
    )
);
?>