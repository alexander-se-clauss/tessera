package tessera.tile.backend.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class FlywayConfig {

    @Bean(initMethod = "migrate")
    Flyway flyway(DataSource dataSource, Environment environment) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations(environment.getProperty(
                        "spring.flyway.locations",
                        "filesystem:src/main/resources/db/migration,classpath:db/migration"
                ).split(","))
                .baselineOnMigrate(environment.getProperty("spring.flyway.baseline-on-migrate", Boolean.class, true))
                .validateOnMigrate(environment.getProperty("spring.flyway.validate-on-migrate", Boolean.class, true))
                .load();
    }

    @Bean
    static BeanFactoryPostProcessor entityManagerFactoryDependsOnFlyway() {
        return new BeanFactoryPostProcessor() {
            @Override
            public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
                if (!(beanFactory instanceof BeanDefinitionRegistry registry)) {
                    return;
                }

                if (!registry.containsBeanDefinition("entityManagerFactory")) {
                    return;
                }

                String[] dependsOn = new String[] {"flyway"};
                registry.getBeanDefinition("entityManagerFactory").setDependsOn(dependsOn);
            }
        };
    }
}
