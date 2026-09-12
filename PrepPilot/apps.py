from django.apps import AppConfig


class PrepPilotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'PrepPilot'
    verbose_name = 'PrepPilot - Dynamic Exam Preparation System'

    def ready(self):
        import PrepPilot.signals  # noqa