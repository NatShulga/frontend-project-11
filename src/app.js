/* eslint-disable indent */
import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import { uniqueId } from 'lodash';
import watch from './view.js';
import locales from './locales/index.js';
import parseXML from './rss-parser.js';

const getUrlRss = (rssUrl) => {
  console.log('getUrlRss: rssUrl =', rssUrl);
  const proxyUrl = new URL('https://allorigins.hexlet.app/get');
  proxyUrl.searchParams.set('disableCache', true);
  proxyUrl.searchParams.set('url', rssUrl);
  return proxyUrl.toString();
};

export default () => {
  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    feedback: document.querySelector('.feedback'),
    posts: document.querySelector('.posts'),
    feeds: document.querySelector('.feeds'),
    modal: document.querySelector('.modal'),
    submitButton: document.querySelector('form button'),
  };

  const initialState = {
    status: 'filling',
    form: {
      errors: '',
    },
    loadedFeeds: [],
    contents: {
      feeds: [],
      posts: [],
    },
    ui: {
      seenPosts: [],
    },
    modal: {
      title: '',
      description: '',
      id: '',
      href: '',
    },
  };

  const i18n = i18next.createInstance();
  i18n.init({
    lng: 'ru',
    debug: false,
    resources: locales,
  });

  const watchedState = watch(elements, i18n, initialState);

  const newNewsPost = () => {
    if (!watchedState || !watchedState.contents) {
      console.error(
        'Ошибка: watchedState или watchedState.contents не определены!',
      );
      return;
    }
    const titlesOfPosts = watchedState.contents.posts.map(({ title }) => title);
    const arrayOfPromises = watchedState.loadedFeeds.map(([url, idOfFeed]) => axios
        .get(getUrlRss(url))
        .then((response) => {
          const { items } = parseXML(response.data);
          console.log('Данные из parseXML:', { items });

          const newPosts = items
            .filter((post) => !titlesOfPosts.includes(post.title))
            .map((item) => {
              const feedId = idOfFeed;
              const id = uniqueId('post_');
              return { ...item, feedId, id };
            });
          if (watchedState.loadedFeeds.length > 0) {
            watchedState.contents.posts = [
              ...newPosts,
              ...watchedState.contents.posts,
            ];
          }
        })
        .catch((error) => {
          console.log('error: ', error);
        }));

    Promise.all(arrayOfPromises).finally(() => {
      setTimeout(() => newNewsPost(), 5000);
    });
  };

  newNewsPost();

  yup.setLocale({
    mixed: {
      required: 'errors.required',
      notOneOf: 'errors.rssAlreadyExists',
    },
    string: {
      url: 'errors.invalidForm',
    },
  });

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const newRss = Object.fromEntries(formData);

    const schema = yup.object().shape({
      url: yup
        .string()
        .required()
        .url()
        .notOneOf(watchedState.loadedFeeds.map(([url]) => url)),
    });

    schema
      .validate(newRss, { abortEarly: false })
      .then(() => {
        watchedState.status = 'loading';
        axios
          .get(getUrlRss(newRss.url), { timeout: 5000 })
          .then((response) => {
            if (response.status >= 200 && response.status < 300) {
              const {
                title,
                link,
                description,
                items,
              } = parseXML(response.data);

              const feedId = uniqueId('feed_');
              const feed = {
              url: newRss.url,
                title,
                link,
                description,
                id: feedId,
              };

              const posts = items.map((item) => ({
                ...item,
                id: uniqueId('post_'),
                feedId,
              }));

              watchedState.contents.feeds.unshift(feed);
              watchedState.contents.posts = [
                ...posts,
                ...watchedState.contents.posts,
              ];
              watchedState.loadedFeeds.push([newRss.url, feedId]);
              watchedState.status = 'filling';
            } else {
              throw new Error('errors.notRSS');
            }
          })
          .catch((error) => {
            const { message } = error;
            watchedState.form.errors = message === 'timeout of 5000ms exceeded' ? 'errors.timeout' : message;
            watchedState.status = 'filling';
          });
      })
      .catch((err) => {
        const { message } = err;
        watchedState.form.errors = message;
        watchedState.status = 'filling';
      });
  });

  elements.posts.addEventListener('click', (event) => {
    if (event.target.dataset.id) {
      const { id } = event.target.dataset;
      if (!watchedState || !watchedState.contents || !watchedState.contents.posts) {
        // eslint-disable-next-line space-in-parens
        console.error( 'Ошибка: watchedState, watchedState.contents или watchedState.contents.posts не определены!');
        return;
      }
      watchedState.contents.posts.forEach((post) => {
        if (post.id === id) {
          watchedState.modal = {
            title: post.title,
            description: post.description,
            href: post.url,
            id: post.id,
          };
          watchedState.ui.seenPosts.push(post.id);
        }
      });
    }
  });
};
