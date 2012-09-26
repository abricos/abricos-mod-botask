<?php
return array(
	'brick' => array(
		'templates' => array(
			"1" => "New comment for the task \"{v#tl}\"",
			"2" => "<p>
		User <b>{v#unm}</b> wrote comment on the task 
		<a href='{v#plnk}'>{v#tl}</a>:
	</p>
	<blockquote>{v#cmt}</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>",
			"3" => "Response to your comment to task \"{v#tl}\"",
			"4" => "<p>User <b>{v#unm}</b> answer to your comment to task <a href='{v#plnk}'>{v#tl}</a>:</p>
	<blockquote>{v#cmt2}</blockquote>
	<p>Comment:</p>
	<blockquote>{v#cmt1}</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>",
			"5" => "Invitation to a discussion of the task \"{v#tl}\"",
			"6" => "<p>
		User <b>{v#unm}</b> published a new task <a href='{v#plnk}'>{v#tl}</a>
		and invite you to discuss it.
	</p>
	<p>Task:</p>
	<blockquote>
	{v#prj}
	</blockquote>
	
	<p>Best regards,<br />
	 {v#sitename}</p>",
			"7" => "New comment for task \"{v#tl}\"",
			"8" => "<p>User <b>{v#unm}</b> wrote a comment to the task <a href='{v#plnk}'>{v#tl}</a>:</p>
	<blockquote>{v#cmt}</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>",
			"101" => "New comment for project \"{v#tl}\"",
			"102" => "<p>
		User <b>{v#unm}</b> wrote a comment to the project 
		<a href='{v#plnk}'>{v#tl}</a>:
	</p>
	<blockquote>{v#cmt}</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>
<p style='font-size:10px;font-family: tahoma, verdana, arial, sans-serif;color:#999999;'>
	The message was sent to your {v#email} 
</p>
		",
			"103" => "Response to your comment on the project \"{v#tl}\"",
			"104" => "<p>User <b>{v#unm}</b> ответил(а) replied to your comment on the project <a href='{v#plnk}'>{v#tl}</a>:</p>
	<blockquote>{v#cmt2}</blockquote>
	<p>Comment:</p>
	<blockquote>{v#cmt1}</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>
<p style='font-size:10px;font-family: tahoma, verdana, arial, sans-serif;color:#999999;'>
	The message was sent to your {v#email} 
</p>
				",
			"105" => "Invitation to discuss the proejct \"{v#tl}\"",
			"106" => "<p>
		User <b>{v#unm}</b> published a new project <a href='{v#plnk}'>{v#tl}</a>
		and invited you to discuss it.
	</p>
	<p>Project:</p>
	<blockquote>
	{v#prj}
	</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>
<p style='font-size:10px;font-family: tahoma, verdana, arial, sans-serif;color:#999999;'>
	The message was sent to your {v#email} 
</p>
				",
			"107" => "New comment for the project\"{v#tl}\"",
			"108" => "<p>User <b>{v#unm}</b> wrote a comment to the project <a href='{v#plnk}'>{v#tl}</a>:</p>
	<blockquote>{v#cmt}</blockquote>
	<p>Best regards,<br />
	 {v#sitename}</p>
<p style='font-size:10px;font-family: tahoma, verdana, arial, sans-serif;color:#999999;'>
	The message was sent to your {v#email} 
</p>
				"
		)

	)
);
?>